import { Readable } from 'stream';
import { visibleProposals } from '@/lib/access';
import { getProposalsAsync } from '@/lib/store';
import { authorize } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  addProposalAttachmentAsync,
  deleteProposalAttachmentAsync,
  getAttachmentFileAsync
} from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { principal, error: authError } = await authorize(req, false);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    const source = searchParams.get('source') || (req.headers.get('x-gcprs-source') ? decodeURIComponent(req.headers.get('x-gcprs-source')!) : null);
    const proposals = await visibleProposals(principal, await getProposalsAsync());
    if (source) id = proposals.flatMap(p => p.attachments || []).find(a => a.static_url && decodeURIComponent(a.static_url) === decodeURIComponent(source))?.id || null;
    const download = searchParams.get('download');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Attachment ID is required' }, { status: 400 });
    }

    const attachment = await getAttachmentFileAsync(id);
    if (!attachment || !proposals.some(p => (p.attachments || []).some(a => a.id === id))) {
      return NextResponse.json({ success: false, error: '첨부파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (download === '1' || source) {
      if (attachment.static_url) {
        const publicRoot = path.resolve(process.cwd(), 'public');
        const relativePath = decodeURIComponent(attachment.static_url).replace(/^\/+/, '');
        const filePath = path.resolve(publicRoot, relativePath);
        const safePath = path.relative(publicRoot, filePath);
        if (safePath.startsWith('..') || path.isAbsolute(safePath)) {
          return NextResponse.json({ success: false, error: '잘못된 첨부파일 경로입니다.' }, { status: 400 });
        }
        if (fs.existsSync(filePath)) {
          const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>;
          const encodedName = encodeURIComponent(attachment.name);
          return new Response(stream, {
            status: 200,
            headers: {
              'Content-Type': attachment.type || 'application/octet-stream',
              'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
              'Cache-Control': 'no-store'
            }
          });
        }
      }

      if (attachment.data_url) {
        const match = attachment.data_url.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = match ? match[1] : (attachment.type || 'application/octet-stream');
        const base64Data = match ? match[2] : attachment.data_url;
        const buffer = Buffer.from(base64Data, 'base64');
        const encodedName = encodeURIComponent(attachment.name);

        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'no-store'
          }
        });
      }
    }

    return NextResponse.json({ success: true, attachment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { proposal_id, name, size, type, data_url } = body;

    if (!proposal_id || !name || !data_url) {
      return NextResponse.json(
        { success: false, error: '필수 파일 정보(proposal_id, name, data_url)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const result = await addProposalAttachmentAsync(proposal_id, {
      name,
      size: Number(size) || 0,
      type: type || 'application/octet-stream',
      data_url
    });

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
      attachments: result.list
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { proposal_id, attachment_id } = body;

    if (!proposal_id || !attachment_id) {
      return NextResponse.json(
        { success: false, error: 'proposal_id 및 attachment_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const list = await deleteProposalAttachmentAsync(proposal_id, attachment_id);
    return NextResponse.json({
      success: true,
      attachments: list
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
