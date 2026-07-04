/**
 * create_admin_account — interactively creates an ADMIN user.
 *
 * Prompts for: username, fullName (defaults to username if blank), password, phone.
 * The password is masked with `*` when run in a real terminal.
 *
 * Run: npm run create_admin_account
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { UserRole } from '@my-app/contract';
import { prisma } from '../src/common/db/prisma';
import { hashPassword } from '../src/common/utils/password.utils';

async function ask(query: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(query)).trim();
  } finally {
    rl.close();
  }
}

// Reads a line without echoing it; masks with `*` on a TTY, reads plainly otherwise.
function askPassword(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    stdout.write(query);
    const isTTY = Boolean(stdin.isTTY);
    let value = '';
    stdin.setEncoding('utf8');
    if (isTTY && stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();

    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      if (isTTY && stdin.setRawMode) stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (chunk: string): void => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          // Enter / Ctrl-D — end of input
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          // Ctrl-C — cancel
          cleanup();
          stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') {
          // Backspace
          if (value.length > 0) {
            value = value.slice(0, -1);
            if (isTTY) stdout.write('\b \b');
          }
        } else if (ch >= ' ') {
          value += ch;
          if (isTTY) stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const username = await ask('Username: ');
  if (!username) throw new Error('Username is required.');

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error(`Username "${username}" is already taken.`);

  const fullNameInput = await ask('Full name (blank = username): ');
  const fullName = fullNameInput || username;

  const password = await askPassword('Password: ');
  if (!password) throw new Error('Password is required.');

  const phone = await ask('Phone: ');
  if (!phone) throw new Error('Phone is required.');

  const hashed = await hashPassword(password);

  const admin = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, password: hashed, role: UserRole.ADMIN, isEnabled: true },
    });
    return tx.admin.create({ data: { userId: user.id, fullName, phone } });
  });

  console.log(`✓ Admin "${username}" created (adminId: ${admin.id}).`);
}

main()
  .catch((err) => {
    console.error('✗ create_admin_account failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
