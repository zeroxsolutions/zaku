import type { MessageBus } from '@zeroxsolutions/cosmic';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command, CommanderError, InvalidArgumentError, Option } from 'commander';
import { createFigmaRest } from '../../lib/adapters/figma-rest.js';
import { libraryExportScript } from '../../lib/adapters/figma-variables-script.js';
import type { PlaywrightModule } from '../../lib/adapters/playwright-recipe-page.js';
import { execRun, type RunCommand } from '../../lib/adapters/shadcn-preset.js';
import {
  RecordBudgetCalls,
  SaveLibrary,
  WriteOutline,
  WriteRecipe,
  WriteSchemas,
  WriteTokens,
} from '../../lib/commands/index.js';
import { ALL_CHECKS } from '../../lib/domain/checks/index.js';
import { variablePartSchema, type LibrarySnapshot } from '../../lib/domain/library.js';
import { mergeParts } from '../../lib/domain/library-parts.js';
import { resolveCopy } from '../../lib/domain/copy-rules.js';
import { leftOut, rulesResultSchema } from '../../lib/domain/rules-result.js';
import { exitCode, formatReport, runChecks, type CheckReport } from '../../lib/domain/run-checks.js';
import type { RecipeWritten, TokensWritten } from '../../lib/handlers/index.js';
import type { OutlineSummary } from '../../lib/handlers/write-outline.js';
import {
  ledgerPath,
  mcpAllowance,
  readLedger,
  seatAndRun,
  today,
  type CallKind,
} from '../../lib/repositories/budget-ledger.js';
import { parseDesignFile, readDesignFile, readOptionalDesignFile } from '../../lib/repositories/design-file.js';
import { designPaths } from '../../lib/repositories/design-paths.js';
import { loadDesign } from '../../lib/repositories/design.js';
import { budgetSchema, zakuConfigSchema } from '../../lib/schema/zaku-config.js';
import { compose } from './dependencies.js';
import { refusalOf } from './error-map.js';

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  env: Record<string, string | undefined>;
  cwd: string;
  fetch?: typeof fetch;
}

export const USAGE = 'usage: zaku <check|outline|tokens|recipe|library|rules|budget|schema> [--root docs/design]';

/** The bus one invocation sends its writes on, and how many REST calls it has made so far. */
export interface CliBus {
  bus: MessageBus;
  restCalls: () => number;
}

/** Registers one subcommand; its action reports the exit code through `finish`. */
export type CommandSpec = (program: Command, io: CliIo, finish: (code: number) => void, cli: CliBus) => void;

/** Sends a command, and turns a refusal the domain raised into its line and exit code. */
async function sendOrRefuse<T>(
  cli: CliBus,
  io: CliIo,
  finish: (code: number) => void,
  command: object,
): Promise<T | null> {
  try {
    return (await cli.bus.send(command)) as T;
  } catch (error) {
    const refusal = refusalOf(error);
    if (!refusal) throw error;
    io.err(refusal.line);
    finish(refusal.code);
    return null;
  }
}

/** Adds the REST calls this invocation made to the seat's ledger. */
async function recordRestCalls(cli: CliBus, io: CliIo): Promise<void> {
  const count = cli.restCalls();
  if (count === 0) return;
  const { seat, run } = seatAndRun(io.env);
  await cli.bus.send(new RecordBudgetCalls({ day: today(clock.now()), seat, run, kind: 'rest', count }));
}

const schemaCommand: CommandSpec = (program, io, finish, cli) => {
  program
    .command('schema')
    .description('write the JSON Schemas an editor reads for the design files')
    .option('--out <dir>', 'where to write them', 'docs/design')
    .action(async (options: { out: string }) => {
      const written = (await cli.bus.send(new WriteSchemas({ out: resolve(io.cwd, options.out) }))) as string[];
      for (const path of written) io.out(`wrote ${path}`);
      finish(0);
    });
};

const checkCommand: CommandSpec = (program, io, finish) => {
  program
    .command('check')
    .description('run every check over the committed design files')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option('--json', 'print the report as JSON')
    .option('--input <rules.json>', 'what use_figma returned for zaku rules script')
    .action(async (options: { root: string; json?: boolean; input?: string }) => {
      const loaded = await loadDesign(resolve(io.cwd, options.root));
      const report: CheckReport = loaded.input
        ? runChecks(loaded.input, ALL_CHECKS)
        : { findings: [], notRun: [], passed: [] };
      report.findings.unshift(...loaded.findings);
      const ran = options.input
        ? parseDesignFile(options.input, await readFile(resolve(io.cwd, options.input), 'utf8'), rulesResultSchema)
        : null;
      if (ran) report.findings.push(...ran.findings);
      const left = ran ? leftOut(ran) : [];
      if (options.json) io.out(JSON.stringify({ ...report, ...(left.length > 0 ? { leftOut: left } : {}) }, null, 2));
      else for (const line of [...left, ...formatReport(report)]) io.out(line);
      finish(loaded.input ? exitCode(report) : 1);
    });
};

/** What the CLI runs outside itself; a spec replaces it. */
/**
 * Playwright from the product's own dependencies: the bundle ships no browser driver. It is required,
 * not imported, because Node's import of its CommonJS entry exposes no named `chromium`.
 */
async function productPlaywright(cwd: string): Promise<PlaywrightModule | null> {
  const require = createRequire(join(cwd, 'package.json'));
  let resolved: string;
  try {
    resolved = require.resolve('playwright');
  } catch {
    return null;
  }
  // NODE_PATH, which a package manager's bin shim sets, would hand over a copy that is not the product's.
  if (!fromProductTree(cwd, resolved)) return null;
  return require('playwright') as PlaywrightModule;
}

/** Whether a resolved module sits in a node_modules of `cwd` or of one of its ancestors. */
function fromProductTree(cwd: string, resolved: string): boolean {
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (resolved.startsWith(join(dir, 'node_modules') + sep)) return true;
    if (dirname(dir) === dir) return false;
  }
}

export const runners: {
  run: RunCommand;
  loadPlaywright: (cwd: string) => Promise<PlaywrightModule | null>;
  /** The bundled rules script, which ships beside the CLI as rules.js. */
  rulesLibrary: () => Promise<string>;
} = {
  run: execRun,
  loadPlaywright: productPlaywright,
  rulesLibrary: () => readFile(fileURLToPath(new URL('./rules.js', import.meta.url)), 'utf8'),
};

const tokensCommand: CommandSpec = (program, io, finish, cli) => {
  program
    .command('tokens')
    .description("write the code's tokens to tokens.json, from the design system zaku.yaml names")
    .option('--css <path>', 'the stylesheet that declares :root and .dark (shadcn)')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .action(async (options: { css?: string; root: string }) => {
      const command = new WriteTokens({
        root: resolve(io.cwd, options.root),
        cwd: io.cwd,
        css: options.css ? resolve(io.cwd, options.css) : null,
      });
      const written = await sendOrRefuse<TokensWritten>(cli, io, finish, command);
      if (!written) return;
      io.out(`wrote ${written.path}: ${written.colours} colours, ${written.from}`);
      finish(0);
    });
};

const recipeCommand: CommandSpec = (program, io, finish, cli) => {
  program
    .command('recipe')
    .description("write what the code computes for every variant to recipe.json, from the product's recipe page")
    .option('--url <url>', "the recipe page, when it is not zaku.yaml's recipe.url")
    .option('--root <dir>', 'the design directory', 'docs/design')
    .action(async (options: { url?: string; root: string }) => {
      const command = new WriteRecipe({
        root: resolve(io.cwd, options.root),
        url: options.url ?? null,
      });
      const written = await sendOrRefuse<RecipeWritten>(cli, io, finish, command);
      if (!written) return;
      io.out(
        `wrote ${written.path}: ${written.components} components, ${written.variants} variants, in light and dark`,
      );
      finish(0);
    });
};

/** The clock the ledger dates its day by; a spec replaces it. */
export const clock: { now: () => Date } = { now: () => new Date() };

function positiveInteger(value: string): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) throw new InvalidArgumentError('a whole number of calls, 1 or more');
  return count;
}

const budgetCommand: CommandSpec = (program, io, finish, cli) => {
  const budget = program.command('budget').description('count Figma calls against the seat budget');
  const ledger = (): { path: string; seat: string; run: string; day: string } => ({
    path: ledgerPath(io.env, process.platform, homedir()),
    ...seatAndRun(io.env),
    day: today(clock.now()),
  });
  budget
    .command('record')
    .description('add calls to the ledger')
    .addOption(new Option('--kind <kind>', 'which calls').choices(['mcp', 'rest']).makeOptionMandatory())
    .requiredOption('--count <n>', 'how many', positiveInteger)
    .action(async (options: { kind: CallKind; count: number }) => {
      const { seat, run, day } = ledger();
      await cli.bus.send(new RecordBudgetCalls({ day, seat, run, kind: options.kind, count: options.count }));
      finish(0);
    });
  budget
    .command('status')
    .description('exit 4 when the budget refuses another MCP call')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .action(async (options: { root: string }) => {
      const { path, seat, run, day } = ledger();
      const config = await readOptionalDesignFile(designPaths(resolve(io.cwd, options.root)).config, zakuConfigSchema);
      const allowance = mcpAllowance(await readLedger(path, day), seat, run, config?.budget ?? budgetSchema.parse({}));
      io.out(
        `mcp ${allowance.usedToday} today, ${allowance.usedThisRun} this run${allowance.reason ? `: ${allowance.reason}` : ''}`,
      );
      finish(allowance.ok ? 0 : 4);
    });
};

const outlineCommand: CommandSpec = (program, io, finish, cli) => {
  program
    .command('outline')
    .description("read the product file's frames into docs/design/outline")
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option('--frames <ids>', 'only these frame ids, comma separated')
    .action(async (options: { root: string; frames?: string }) => {
      const root = resolve(io.cwd, options.root);
      const report = (summary: { skipped: boolean; read: number; written: string[]; unmapped: number }): void =>
        io.out(
          summary.skipped
            ? 'outline is current; nothing read'
            : `read ${summary.read} frames, wrote ${summary.written.length} outlines, ${summary.unmapped} unmapped`,
        );
      if (!io.env['FIGMA_TOKEN']) {
        io.err('zaku outline needs FIGMA_TOKEN, a Figma personal access token with file read access');
        finish(3);
        return;
      }
      try {
        const frames = options.frames ? options.frames.split(',') : null;
        report((await cli.bus.send(new WriteOutline({ root, frames }))) as OutlineSummary);
        finish(0);
      } finally {
        await recordRestCalls(cli, io);
      }
    });
};

const libraryCommand: CommandSpec = (program, io, finish, cli) => {
  const library = program.command('library').description("snapshot the library's components and tokens");
  library
    .command('script')
    .description('print the Plugin API code that exports the library variables, for use_figma')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option('--local', "also list the file's own components, for a library in the product file")
    .option('--page <name>', 'with --local, list only this page; one use_figma call per page')
    .action(async (options: { root: string; local?: boolean; page?: string }) => {
      const config = await readDesignFile(designPaths(resolve(io.cwd, options.root)).config, zakuConfigSchema);
      io.out(
        libraryExportScript({
          combos: [config.modes],
          ...(options.local ? { local: true } : {}),
          ...(options.local && options.page !== undefined ? { page: options.page } : {}),
        }),
      );
      finish(0);
    });
  library
    .command('save')
    .description('write library.json: the library components read over Figma REST, joined to the variables export')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option(
      '--input <variables.json>',
      'what use_figma returned for zaku library script; once per page export for a library in the product file',
      (value: string, previous: string[] = []) => [...previous, value],
    )
    .action(async (options: { root: string; input?: string[] }) => {
      const root = resolve(io.cwd, options.root);
      if (!options.input || options.input.length === 0) {
        io.err('zaku library save needs --input, the variables use_figma returned for zaku library script');
        finish(3);
        return;
      }
      if (!io.env['FIGMA_TOKEN']) {
        io.err('zaku library save needs FIGMA_TOKEN to read the library components');
        finish(3);
        return;
      }
      const part = mergeParts(
        await Promise.all(
          options.input.map(async (input) =>
            parseDesignFile(input, await readFile(resolve(io.cwd, input), 'utf8'), variablePartSchema),
          ),
        ),
      );
      try {
        const snapshot = (await cli.bus.send(new SaveLibrary({ root, part }))) as LibrarySnapshot;
        if (snapshot.components.length === 0) {
          io.err(
            'library.json holds no components: the file publishes none and the export listed none; for a library in the product file, run zaku library script --local',
          );
          finish(1);
          return;
        }
        io.out(`wrote library.json: ${snapshot.components.length} components at version ${snapshot.version}`);
        finish(0);
      } finally {
        await recordRestCalls(cli, io);
      }
    });
};

const rulesCommand: CommandSpec = (program, io, finish) => {
  const rules = program
    .command('rules')
    .description("zaku's rule checks, for a run that reaches Figma through use_figma");
  rules
    .command('script')
    .description('print the Plugin API code that runs the rules over a page or a node, for use_figma')
    .option('--root <dir>', 'the design directory', 'docs/design')
    .option('--page <page>', 'the page to check, by id or name')
    .option('--node <id>', 'the node to check, with everything inside it')
    .action(async (options: { root: string; page?: string; node?: string }) => {
      if ((options.page === undefined) === (options.node === undefined)) {
        io.err('zaku rules script needs --page or --node, one of them');
        finish(3);
        return;
      }
      const config = await readDesignFile(designPaths(resolve(io.cwd, options.root)).config, zakuConfigSchema);
      const scope = options.node !== undefined ? { nodeId: options.node } : { page: options.page };
      io.out(
        `${await runners.rulesLibrary()}\nreturn await zakuRulesLib.zakuRules(figma, ${JSON.stringify({ scope, copy: resolveCopy(config.copy) })});`,
      );
      finish(0);
    });
};

export const COMMANDS: CommandSpec[] = [
  checkCommand,
  outlineCommand,
  libraryCommand,
  rulesCommand,
  tokensCommand,
  recipeCommand,
  budgetCommand,
  schemaCommand,
];

export async function main(argv: string[], io: CliIo): Promise<number> {
  let code = 0;
  const program = new Command('zaku').exitOverride().configureOutput({
    writeOut: (text) => io.out(text.trimEnd()),
    writeErr: (text) => io.err(text.trimEnd()),
  });
  let calls = 0;
  const token = io.env['FIGMA_TOKEN'];
  const bus = compose({
    env: io.env,
    now: () => clock.now(),
    run: runners.run,
    loadPlaywright: () => runners.loadPlaywright(io.cwd),
    rest: token ? createFigmaRest({ token, fetch: io.fetch, onCall: () => (calls += 1) }) : null,
  });
  const cli: CliBus = { bus, restCalls: () => calls };
  for (const register of COMMANDS) register(program, io, (exit) => (code = exit), cli);
  const name = argv[0];
  if (name === '--help' || name === '-h') {
    io.out(program.helpInformation().trimEnd());
    return 0;
  }
  if (!name || !program.commands.some((command) => command.name() === name)) {
    io.err(USAGE);
    return 3;
  }
  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed') return 0;
      io.err(USAGE);
      return 3;
    }
    // A hook or CI reads one line; a stack trace is noise to both.
    io.err(`zaku: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  return code;
}
