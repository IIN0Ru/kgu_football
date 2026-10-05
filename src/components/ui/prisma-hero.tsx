/**
 * PrismaHero — 출처: 21st.dev (사용자가 전달한 prisma-hero.tsx)
 *
 * 원본에서 바꾼 점 (NOTES.md 개발 로그 #5 참고):
 * - 메뉴, 큰 글자, 소개 문구, 버튼을 props로 받도록 변경 (원본은 Prisma 문구 고정)
 * - 배경 영상: 원본 영상은 제작자 서버 파일이라 제외. videoSrc가 없으면 어두운 배경만 표시
 * - 버튼을 <button> 대신 링크(<a>)로 변경 (페이지 안 이동이므로)
 * - 메뉴 색 변경을 JS 대신 CSS hover로 처리, 키보드 포커스 표시 추가
 * - 별표(*)는 각주로 연결 (비공식 사이트 고지)
 */
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  asteriskHref?: string;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({
  text,
  className = "",
  showAsterisk = false,
  asteriskHref,
  style,
}: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={reduce ? false : { y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
            className="relative inline-block"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <a
                href={asteriskHref}
                aria-label="각주: 비공식 사이트 안내"
                className="absolute -right-[0.3em] top-[0.65em] text-[0.31em]"
              >
                *
              </a>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={reduce ? false : { y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */
export interface HeroNavItem {
  label: string;
  href: string;
}

interface PrismaHeroProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  navItems: HeroNavItem[];
  /** 배경 영상 주소. 사용 권한이 확인된 영상만 넣는다. 없으면 어두운 배경 */
  videoSrc?: string;
  asteriskHref?: string;
}

const PrismaHero = ({
  title,
  description,
  ctaLabel,
  ctaHref,
  navItems,
  videoSrc,
  asteriskHref,
}: PrismaHeroProps) => {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  return (
    <section className="h-screen min-h-[560px] w-full p-2 md:p-3" aria-label="소개">
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-panel md:rounded-[2rem]">
        {/* Background video (권한 확인된 영상만) */}
        {videoSrc && (
          <video
            autoPlay={!reduce}
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            src={videoSrc}
          />
        )}

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Navbar */}
        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2" aria-label="주요 메뉴">
          <div className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 lg:gap-14">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="whitespace-nowrap text-[11px] text-cream/80 transition-colors hover:text-cream sm:text-xs md:text-sm"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            <div className="col-span-12 lg:col-span-8">
              <h1 className="text-[26vw] font-medium leading-[0.85] tracking-[-0.07em] text-cream sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw]">
                <WordsPullUp text={title} showAsterisk asteriskHref={asteriskHref} />
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
              <motion.p
                {...enter(0.5)}
                className="text-sm text-primary/70 md:text-base"
                style={{ lineHeight: 1.4 }}
              >
                {description}
              </motion.p>

              <motion.a
                {...enter(0.7)}
                href={ctaHref}
                className="group inline-flex items-center gap-2 self-start rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
              >
                {ctaLabel}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4 text-cream" aria-hidden="true" />
                </span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
