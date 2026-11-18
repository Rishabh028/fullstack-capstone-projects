import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Find user's primary workspace
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  });

  if (member?.workspace) {
    redirect(`/workspace/${member.workspace.slug}`);
  }

  redirect('/login');
}
