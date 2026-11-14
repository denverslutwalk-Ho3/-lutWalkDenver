import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { requireMemberOrAdmin } from '../../../../lib/authz';

const ARCHIVE_MEDIA_TYPES = new Map([
  ['slutwalk-2021-1.jpg', 'image/jpeg'],
  ['slutwalk-2021-2.jpg', 'image/jpeg'],
  ['call-for-zines.jpg', 'image/jpeg'],
  ['how-to-submit.jpg', 'image/jpeg'],
  ['who-wants-to-submit.jpg', 'image/jpeg'],
  ['never-again-poster.jpg', 'image/jpeg'],
  ['pocket-zine.png', 'image/png'],
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  if (!(await requireMemberOrAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename } = await params;
  const contentType = ARCHIVE_MEDIA_TYPES.get(filename);
  if (!contentType) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const contents = await readFile(join(
      process.cwd(),
      'assets/community-media/archive',
      filename,
    ));
    const body = new ArrayBuffer(contents.byteLength);
    new Uint8Array(body).set(contents);
    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('GET /api/archive-media/[filename] error:', err);
    return NextResponse.json({ error: 'Failed to load archive media' }, { status: 500 });
  }
}
