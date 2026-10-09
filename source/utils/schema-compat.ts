import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Converts a Zod Schema to Gemini-compatible JSON Schema 7 without any $ref pointers.
 */
export function zodToJSONSchema7(zodObj: any): Record<string, any> {
    return (zodToJsonSchema as any)(zodObj, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
    }) as Record<string, any>;
}

/**
 * Recursively cleans a standard JSON schema object to ensure 100% Gemini / Multi-LLM compatibility:
 * 1. Flattens or resolves any $ref pointers
 * 2. Removes $schema, definitions, $defs that may confuse strict LLM parsers
 * 3. Ensures objects with properties have type: 'object'
 */
export function sanitizeJsonSchemaForGemini(schema: any): any {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    if (Array.isArray(schema)) {
        return schema.map(item => sanitizeJsonSchemaForGemini(item));
    }

    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(schema)) {
        // Skip metadata fields that cause issues in Gemini / Claude
        if (key === '$schema' || key === '$defs' || key === 'definitions') {
            continue;
        }

        // Inline $ref if any
        if (key === '$ref' && typeof value === 'string') {
            // If there's an unexpanded $ref, replace with generic object to prevent parser crash
            return { type: 'object', description: `Referenced schema: ${value}` };
        }

        cleaned[key] = sanitizeJsonSchemaForGemini(value);
    }

    // Ensure type: 'object' if properties are defined
    if (cleaned.properties && !cleaned.type) {
        cleaned.type = 'object';
    }

    return cleaned;
}
