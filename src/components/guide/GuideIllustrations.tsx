import type { ReactNode } from "react";
import type { GuideSectionData } from "@/lib/stillframe/guide";

const c = { ink: "var(--ap-ink)", body: "var(--ap-muted)", card: "var(--ap-card)", panel: "var(--ap-panel)", line: "var(--ap-hairline)", blue: "var(--ap-blue)", soft: "var(--ap-soft-blue)", photo: "var(--el-photo)", text: "var(--el-headline)", sub: "var(--el-subline)", logo: "var(--el-logo)" };
function Label({ x, y, children, accent = false }: { x: number; y: number; children: ReactNode; accent?: boolean }) {
  return <text x={x} y={y} fill={accent ? c.blue : c.body} fontSize="12" fontWeight="500">{children}</text>;
}
function Panel({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ReactNode }) {
  return <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="4" fill={c.card} stroke={c.line} />{children}</g>;
}
function Arrow({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y}h32m-8-8 8 8-8 8`} stroke={c.blue} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}
function MockPhoto({ x = 0, y = 0, w = 72, h = 84, alternate = false }: { x?: number; y?: number; w?: number; h?: number; alternate?: boolean }) {
  return <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="4" fill={alternate ? c.soft : c.panel} />
    <ellipse cx={w * .5} cy={h * .83} rx={w * .33} ry={h * .055} fill={c.line} />
    <path d={`M${w * .29} ${h * .34} Q${w * .27} ${h * .22} ${w * .38} ${h * .22} H${w * .62} Q${w * .73} ${h * .22} ${w * .71} ${h * .34} L${w * .65} ${h * .8} H${w * .35}Z`} fill={alternate ? c.sub : c.photo} opacity=".7" />
    <path d={`M${w * .39} ${h * .24}v${-h * .07}q${w * .11} ${-h * .1} ${w * .22} 0v${h * .07}`} fill="none" stroke={alternate ? c.sub : c.photo} strokeWidth="2" />
  </g>;
}
function MockPhone({ x = 0, y = 0, w = 114, h = 198, words = true }: { x?: number; y?: number; w?: number; h?: number; words?: boolean }) {
  return <g transform={`translate(${x} ${y})`}><rect width={w} height={h} rx="4" fill={c.card} stroke={c.line} /><MockPhoto x={7} y={7} w={w - 14} h={h - 14} alternate />
    {words && <><rect x={17} y={h * .6} width={w - 34} height="7" rx="2" fill={c.ink} /><rect x={17} y={h * .6 + 14} width={w * .48} height="4" rx="2" fill={c.sub} /><circle cx={w / 2} cy={h - 23} r="5" fill={c.logo} /></>}
  </g>;
}
function MockFrameRail({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>{[0, 1, 2].map((n) => <g key={n} transform={`translate(${n * 58} 0)`}><rect x="-3" y="-3" width="50" height="51" rx="4" fill={c.card} stroke={n === 1 ? c.blue : c.line} strokeWidth={n === 1 ? 2 : 1} /><MockPhoto w={44} h={45} alternate={n === 1} /><Label x={10} y={65}>2.5s</Label></g>)}</g>;
}
function MockInspector({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <Panel x={x} y={y} w={208} h={194}><rect x="12" y="13" width="184" height="28" rx="4" fill={c.panel} /><rect x="74" y="15" width="60" height="24" rx="4" fill={c.card} />
    <Label x={19} y={32}>Photo</Label><Label x={91} y={32} accent>Text</Label><Label x={152} y={32}>Logo</Label>
    <Label x={14} y={65}>Headline</Label><rect x="13" y="75" width="182" height="26" rx="4" fill={c.panel} /><Label x={23} y={93}>Your words</Label>
    <Label x={14} y={123}>Colour</Label>{[c.text, c.sub, c.ink].map((fill, i) => <circle key={fill} cx={83 + i * 28} cy="119" r="8" fill={fill} />)}
    <Label x={14} y={155}>Size</Label><path d="M70 151h110" stroke={c.line} strokeWidth="4" strokeLinecap="round" /><path d="M70 151h65" stroke={c.blue} strokeWidth="4" strokeLinecap="round" /><circle cx="135" cy="151" r="6" fill={c.blue} />
    <Label x={14} y={180}>All frames</Label><rect x="154" y="167" width="29" height="16" rx="8" fill={c.blue} /><circle cx="175" cy="175" r="5" fill={c.card} />
  </Panel>;
}
function MockFormatChips({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const formats = [["9:16", 15, 27], ["4:5", 22, 27], ["1:1", 25, 25], ["16:9", 30, 17], ["5:4", 29, 23]] as const;
  return <g transform={`translate(${x} ${y})`}>{formats.map(([name, w, h], i) => <g key={name} transform={`translate(${i * 72} 0)`}><rect width="62" height="70" rx="4" fill={i === 1 ? c.soft : c.card} stroke={i === 1 ? c.blue : c.line} /><rect x={(62 - w) / 2} y={(42 - h) / 2 + 4} width={w} height={h} rx="2" fill={i === 1 ? c.blue : c.line} /><Label x={name.length > 3 ? 13 : 19} y={58}>{name}</Label></g>)}</g>;
}
function MockExportCard({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <Panel x={x} y={y} w={280} h={174}><Label x={17} y={27}>Your files</Label>{["MP4 · 4:5", "GIF · 4:5"].map((f, i) => <g key={f} transform={`translate(0 ${i * 46})`}><rect x="16" y="40" width="248" height="38" rx="4" fill={c.panel} /><Label x={28} y={64}>{f}</Label><path d="M242 49v14m-5-5 5 5 5-5m-12 9h14" fill="none" stroke={c.blue} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></g>)}<Label x={17} y={153}>≈ Estimated file size</Label></Panel>;
}
export function GuideIllustration({ section }: { section: GuideSectionData }) {
  let content: ReactNode;
  switch (section.illustration) {
    case "start": content = <><MockPhoto x={35} y={48} w={76} h={94} /><MockPhoto x={89} y={90} w={76} h={94} alternate /><Arrow x={184} y={124} /><MockPhone x={246} y={26} /><Label x={239} y={247}>1 clean · 2 marked</Label></>; break;
    case "create": content = <><MockFormatChips x={28} y={30} /><Arrow x={199} y={126} /><MockFrameRail x={125} y={157} /></>; break;
    case "edit": content = <><MockPhone x={35} y={20} w={107} h={174} /><MockInspector x={184} y={20} /><MockFrameRail x={48} y={208} /></>; break;
    case "templates": content = <>{[0, 1, 2].map((n) => <g key={n}><MockPhone x={30 + n * 132} y={30 + (n === 1 ? 0 : 13)} w={106} h={181} /><rect x={44 + n * 132} y="229" width="72" height="5" rx="2" fill={n === 1 ? c.blue : c.line} /></g>)}</>; break;
    case "brand": content = <><Panel x={47} y={30} w={150} h={90}><circle cx="75" cy="44" r="22" fill={c.logo} /><path d="m67 33 23 12-23 12z" fill={c.card} /></Panel><Panel x={218} y={30} w={150} h={90}><rect x="1" y="1" width="148" height="88" rx="4" fill={c.ink} /><circle cx="75" cy="44" r="22" fill={c.card} /><path d="m67 33 23 12-23 12z" fill={c.ink} /></Panel>{[c.blue, c.text, c.sub, c.logo].map((fill, i) => <circle key={fill} cx={74 + i * 37} cy="157" r="12" fill={fill} />)}<text x="50" y="204" fontSize="23" fill={c.ink} fontWeight="600">Aa</text><Label x={104} y={203}>Headline font</Label><text x="50" y="240" fontSize="18" fill={c.sub}>Aa</text><Label x={104} y={239}>Subline font</Label></>; break;
    case "export": content = <><MockPhone x={24} y={45} w={86} h={150} words={false} /><MockExportCard x={130} y={40} /><Label x={130} y={241}>4:5 · Custom size · Quality</Label></>; break;
    case "share": content = <><MockPhone x={44} y={30} /><Arrow x={182} y={124} /><Panel x={244} y={65} w={150} h={147}><Label x={15} y={28}>Share</Label><rect x="16" y="48" width="40" height="23" rx="12" fill={c.line} /><circle cx="28" cy="59" r="8" fill={c.card} /><Label x={16} y={103}>Private</Label><path d="M20 121h100" stroke={c.line} strokeWidth="4" strokeLinecap="round" /></Panel></>; break;
    case "team": content = <><Panel x={109} y={87} w={222} h={104}><Label x={26} y={31}>Shared workspace</Label><rect x="26" y="49" width="72" height="29" rx="4" fill={c.soft} /><rect x="115" y="49" width="80" height="29" rx="4" fill={c.panel} /><Label x={34} y={69}>Brand kit</Label><Label x={124} y={69}>Templates</Label></Panel>{[0, 1, 2, 3, 4].map((n) => <g key={n}><path d={`M${56 + n * 82} 56 220 87`} stroke={c.line} /><circle cx={56 + n * 82} cy="43" r="17" fill={n % 2 ? c.sub : c.blue} opacity=".75" /><circle cx={56 + n * 82} cy="39" r="5" fill={c.card} /><path d={`M${48 + n * 82} 53q8-13 16 0`} fill={c.card} /></g>)}<Label x={154} y={230}>One shared allowance</Label></>; break;
    case "stats": content = <Panel x={32} y={25} w={376} h={228}><Label x={19} y={27}>Views</Label><Label x={144} y={27}>Saves</Label><Label x={257} y={27}>Website clicks</Label>{[0, 1, 2].map((n) => <rect key={n} x={20 + n * 121} y="39" width="54" height="8" rx="2" fill={n === 1 ? c.sub : c.blue} opacity=".7" />)}<path d="M25 180h325M25 130h325M25 80h325" stroke={c.line} /><path d="m27 174 43-22 40 7 45-38 43 14 42-41 45 6 53-29" stroke={c.blue} strokeWidth="3" fill="none" strokeLinejoin="round" /><path d="m27 191 43-8 40 1 45-21 43 7 42-16 45 4 53-29" stroke={c.sub} strokeWidth="2" fill="none" /><Label x={24} y={211}>Your published reels</Label></Panel>; break;
    case "directory": content = <><Label x={35} y={30}>Aimanté</Label>{[0, 1, 2].map((n) => <g key={n}><MockPhone x={35 + n * 131} y={49} w={105} h={174} /><rect x={35 + n * 131} y="237" width="65" height="4" rx="2" fill={c.body} /></g>)}</>; break;
    case "shopify": content = <><MockPhoto x={29} y={43} w={85} h={99} /><MockPhoto x={128} y={117} w={85} h={99} alternate /><Arrow x={208} y={90} /><MockPhone x={284} y={31} /></>; break;
    case "billing": content = <Panel x={58} y={32} w={324} h={215}><Label x={23} y={29}>Your plan</Label><rect x="23" y="44" width="120" height="9" rx="2" fill={c.ink} /><Label x={23} y={87}>Exports used</Label><rect x="23" y="102" width="278" height="10" rx="4" fill={c.panel} /><rect x="23" y="102" width="102" height="10" rx="4" fill={c.blue} /><path d="M23 139h278" stroke={c.line} /><Label x={23} y={166}>Extra exports</Label><Label x={23} y={190}>Never expire</Label><circle cx="279" cy="177" r="15" fill={c.soft} /><path d="M272 177h14m-7-7v14" stroke={c.blue} strokeWidth="1.7" /></Panel>; break;
    case "support": content = <Panel x={54} y={30} w={324} h={215}><Label x={20} y={30}>Contact support</Label><rect x="20" y="47" width="284" height="85" rx="4" fill={c.panel} /><path d="M36 67h236m-236 16h199m-199 16h219" stroke={c.line} strokeWidth="5" strokeLinecap="round" /><MockPhoto x={20} y={145} w={39} h={44} /><Label x={72} y={171}>Screenshot</Label><path d="m261 170 29-13-9 29-6-11z" fill="none" stroke={c.blue} strokeWidth="1.7" strokeLinejoin="round" /></Panel>; break;
  }
  return <figure className="my-6 overflow-hidden rounded-sm border border-ap-hairline bg-ap-panel/60 p-3 sm:p-6"><svg role="img" aria-label={section.imageDescription} viewBox="0 0 440 282" className="mx-auto block aspect-[440/282] w-full max-w-[480px] font-ap"><g aria-hidden="true">{content}</g></svg></figure>;
}
