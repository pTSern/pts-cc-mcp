import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

function exists(p: string): boolean {
    try {
        return fs.existsSync(p);
    } catch (e) {
        return false;
    }
}

export function findTscCompiler(projectPath: string): string | null {
    const resources = (process as any).resourcesPath || (typeof Editor !== 'undefined' && Editor.App ? path.dirname(Editor.App.path) : '');
    const candidates = [
        path.join(projectPath, 'node_modules', 'typescript', 'bin', 'tsc'),
        path.join(projectPath, 'extensions', 'pts-cc-mcp', 'node_modules', 'typescript', 'bin', 'tsc'),
        path.join(resources, 'resources', '3d', 'engine', 'node_modules', 'typescript', 'bin', 'tsc'),
        path.join(resources, 'resources', '3d', 'engine', 'node_modules', '@cocos', 'typescript', 'bin', 'tsc'),
        path.join(resources, 'app.asar.unpacked', 'node_modules', 'typescript', 'bin', 'tsc'),
    ];
    if (typeof Editor !== 'undefined' && Editor.App && Editor.App.path) {
        candidates.push(path.join(Editor.App.path, 'node_modules', 'typescript', 'bin', 'tsc'));
    }
    return candidates.find(exists) || null;
}

function runTsc(tsc: string, tsconfig: string, cwd: string): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
        execFile(
            process.execPath,
            [tsc, '--noEmit', '-p', tsconfig, '--pretty', 'false'],
            {
                cwd,
                env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }),
                maxBuffer: 16 * 1024 * 1024,
                timeout: 5 * 60 * 1000,
            },
            (error, stdout, stderr) => {
                const exitCode = error && typeof (error as any).code === 'number' ? (error as any).code : (error ? 1 : 0);
                resolve({ exitCode, output: `${stdout || ''}\n${stderr || ''}` });
            }
        );
    });
}

export interface TsDiagnosticError {
    file: string;
    line: number;
    column: number;
    code: string;
    message: string;
    snippet?: string;
}

export interface TsCheckResult {
    ok: boolean;
    errorCount: number;
    errors: TsDiagnosticError[];
    truncated: boolean;
    compiler: string;
    tsconfig: string;
    durationMs: number;
}

export function parseTscOutput(output: string): Array<{ file: string; line: number; column: number; code: string; message: string }> {
    const re = /^(.*)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/i;
    return String(output)
        .split(/\r?\n/)
        .map((l) => re.exec(l.trim()))
        .filter((m): m is RegExpExecArray => Boolean(m))
        .map((m) => ({
            file: m[1],
            line: Number(m[2]),
            column: Number(m[3]),
            code: m[4],
            message: m[5],
        }));
}

export async function checkTypeScript(options: { maxErrors?: number; snippetLines?: number } = {}): Promise<TsCheckResult> {
    const projectPath = typeof Editor !== 'undefined' && Editor.Project ? Editor.Project.path : process.cwd();
    const candidateConfigs = [
        path.join(projectPath, 'tsconfig.json'),
        path.join(projectPath, 'temp', 'tsconfig.cocos.json')
    ];
    const tsconfig = candidateConfigs.find(exists);
    if (!tsconfig) {
        throw new Error('No tsconfig.json found in project.');
    }

    const tsc = findTscCompiler(projectPath);
    if (!tsc) {
        throw new Error('No TypeScript compiler (tsc) found in project or Cocos Creator distribution.');
    }

    const started = Date.now();
    const { exitCode, output } = await runTsc(tsc, tsconfig, projectPath);
    const parsedErrors = parseTscOutput(output);
    const maxErrors = options.maxErrors || 50;
    const snippetLines = options.snippetLines === undefined ? 2 : options.snippetLines;
    const lineCache = new Map<string, string[]>();

    const errors: TsDiagnosticError[] = parsedErrors.slice(0, maxErrors).map((d) => {
        const abs = path.isAbsolute(d.file) ? d.file : path.join(projectPath, d.file);
        const rel = path.relative(projectPath, abs).split(path.sep).join('/');
        const entry: TsDiagnosticError = {
            file: rel,
            line: d.line,
            column: d.column,
            code: d.code,
            message: d.message,
        };

        if (snippetLines > 0 && exists(abs)) {
            if (!lineCache.has(abs)) {
                lineCache.set(abs, fs.readFileSync(abs, 'utf8').split(/\r?\n/));
            }
            const lines = lineCache.get(abs)!;
            const from = Math.max(1, d.line - snippetLines);
            const to = Math.min(lines.length, d.line + snippetLines);
            const snippetArr: string[] = [];
            for (let n = from; n <= to; n++) {
                snippetArr.push(`${n === d.line ? '>' : ' '}${String(n).padStart(5)} | ${lines[n - 1]}`);
            }
            entry.snippet = snippetArr.join('\n');
        }
        return entry;
    });

    if (exitCode !== 0 && parsedErrors.length === 0) {
        throw new Error(`TypeScript compilation failed without structured diagnostics: ${output.trim().slice(0, 2000)}`);
    }

    return {
        ok: parsedErrors.length === 0,
        errorCount: parsedErrors.length,
        errors,
        truncated: parsedErrors.length > errors.length,
        compiler: path.relative(projectPath, tsc).split(path.sep).join('/'),
        tsconfig: path.relative(projectPath, tsconfig).split(path.sep).join('/'),
        durationMs: Date.now() - started,
    };
}
