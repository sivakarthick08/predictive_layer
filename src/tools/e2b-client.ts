/**
 * E2B Sandbox Client
 */
import { Sandbox } from '@e2b/code-interpreter';

export async function executePythonCode(
  code: string, 
  files?: Record<string, string>,
  timeoutMs: number = 60000 // 60 second default timeout
) {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) {
    throw new Error('E2B_API_KEY environment variable is required');
  }

  // Create sandbox
  const sandbox = await Sandbox.create({ apiKey });

  try {
    // Upload files if provided
    if (files) {
      for (const [filename, content] of Object.entries(files)) {
        await sandbox.files.write(filename, content);
      }
    }

    // Execute code with timeout
    const executionPromise = sandbox.runCode(code);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`E2B execution timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    const execution = await Promise.race([executionPromise, timeoutPromise]);

    return {
      stdout: execution.logs.stdout.join('\n'),
      stderr: execution.logs.stderr.join('\n'),
      results: execution.results,
      error: execution.error,
    };
  } finally {
    // Always close the sandbox
    await sandbox.kill();
  }
}

export default {
  executePythonCode,
};
