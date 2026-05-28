#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function hasNextDevOnPort3000() {
  const script = "ss -ltnp 2>/dev/null | grep ':3000 ' | grep -E 'node|next' || true";
  const out = spawnSync('bash', ['-lc', script], { encoding: 'utf8' });
  return (out.stdout || '').trim().length > 0;
}

if (hasNextDevOnPort3000() && process.env.ALLOW_BUILD_WITH_DEV !== '1') {
  console.error('\n[안전 중단] next dev 서버가 켜진 상태에서 next build를 실행하면 .next 캐시가 꼬여 빈 페이지/CSS 404가 날 수 있습니다.');
  console.error('먼저 dev 서버를 종료한 뒤 다시 실행하세요.');
  console.error('정말 강제로 빌드하려면 ALLOW_BUILD_WITH_DEV=1 npm run build 를 사용하세요.\n');
  process.exit(1);
}

const result = spawnSync('next', ['build'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
