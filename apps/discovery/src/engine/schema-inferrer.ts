import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from 'quicktype-core';

/**
 * Infers a TypeScript interface definition from a JSON sample using quicktype-core.
 * Returns the interface definition as a string.
 * Returns a comment string if inference fails.
 */
export async function inferSchema(json: unknown, typeName: string): Promise<string> {
  try {
    const jsonInput = jsonInputForTargetLanguage('typescript');
    await jsonInput.addSource({
      name: typeName,
      samples: [JSON.stringify(json)],
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    const result = await quicktype({
      inputData,
      lang: 'typescript',
      rendererOptions: {
        'just-types': 'true',
        'runtime-typecheck': 'false',
      },
    });

    return result.lines.join('\n');
  } catch {
    return '// Could not infer schema';
  }
}
