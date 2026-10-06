/**
 * PrismaHero — 출처: 21st.dev (사용자가 전달한 prisma-hero.tsx)
 *
 * 원본에서 바꾼 점 (NOTES.md 개발 로그 #5 참고):
 * - 메뉴, 큰 글자, 소개 문구, 버튼을 props로 받도록 변경 (원본은 Prisma 문구 고정)
 * - 배경 영상: 원본 영상은 제작자 서버 파일이라 제외. videoSrc가 없으면 어두운 배경만 표시
 * - 버튼을 <button> 대신 링크(<a>)로 변경 (페이지 안 이동이므로)
 * - 메뉴 색 변경을 JS 대신 CSS hover로 처리, 키보드 포커스 표시 추가
 * - 별표(*)는 각주로 연결 (비공식 사이트 고지)
 * - 첫 화면 넘기기는 use-hero-snap.ts가 화면을 미끄러뜨려 처리 → KGU·소개가 실제로 위로 올라가며 사라짐
 * - 버튼 클릭도 같은 넘기기 동작(onCtaClick)으로 연결
 * - 배경 사진(image) 추가: 카드 안에 사진을 깔 수 있게
 * - bare 모드 추가: 카드 배경·모서리·덮개 없이 글자와 메뉴만. 사이트 전체 고정 배경(site-background.tsx) 위에 얹을 때 사용
 * - 큰 글자 등장 강화: 흐림 + 아래에서 크게 올라옴 (1.2초). 동작 줄이기 설정 시 페이드만
 * - 큰 글자 대신 로고(logo)를 쓸 수 있게: 이때 히어로에는 화면 읽기용 제목만 두고, 로고 그림은 floating-logo.tsx 가 그림
 * - 소개 글·버튼을 선택 항목으로 (사이트에서는 사용자 요청으로 둘 다 뺌, KGU만 남김)
 * - 메뉴(navItems)를 선택 항목으로: 사이트에서는 히어로 안 메뉴를 빼고 dock-nav 하나를 처음부터 고정 (메뉴가 올라갔다 다시 내려오는 부자연스러움 제거)
 * - 테두리만 있는 큰 영문 글자(outlineWord, 사이트에서는 TURTLES)를 오른쪽 아래(모바일은 오른쪽 위)에 깔 수 있게 (시안 C)
 * - SCROLL 안내(scrollHint): SCROLL 글자 + 아래로 계속 흘러내리는 짧은 선. 데스크톱은 로고와 TURTLES 사이, 휴대폰은 오른쪽 아래 (2026-10-07)
 * - 밝은 테마: 상단 메뉴를 검은 탭 → 밝은 반투명 탭(검은 글자)으로. 밝아진 사진 위 소개 글에 그림자 추가
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
            initial={reduce ? { opacity: 0 } : { y: "70%", opacity: 0, filter: "blur(12px)" }}
            animate={isInView ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
            transition={{ duration: reduce ? 0.4 : 1.2, delay: 0.1 + i * 0.12, ease: EASE }}
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
  /** 큰 글자 대신 보여줄 로고 이미지. 있으면 title 은 화면 읽기용 대체 글로만 씀 */
  logo?: { src: string; alt: string };
  /** 없으면 소개 글을 그리지 않음 */
  description?: string;
  /** 없으면 버튼을 그리지 않음 */
  ctaLabel?: string;
  ctaHref?: string;
  /** 비우면 히어로 안 메뉴를 그리지 않음 (사이트에서는 dock-nav 하나가 처음부터 고정) */
  navItems?: HeroNavItem[];
  /** 배경 영상 주소. 사용 권한이 확인된 영상만 넣는다. 없으면 어두운 배경 */
  videoSrc?: string;
  asteriskHref?: string;
  id?: string;
  /** 배경 사진. 사용 권한·출처가 확인된 것만. 영상이 있으면 영상이 우선 */
  image?: {
    webpSrcSet: string;
    jpgSrcSet: string;
    src: string;
    alt: string;
  };
  /** 카드 배경·모서리·덮개 없이 글자와 메뉴만 (뒤에 고정 배경이 있을 때) */
  bare?: boolean;
  onCtaClick?: () => void;
  /** 테두리만 있는 큰 영문 장식 글자 (예: 축구부 별명) */
  outlineWord?: string;
  /** 아래 가운데 SCROLL 안내와 흘러내리는 선 */
  scrollHint?: boolean;
}

const PrismaHero = ({
  title,
  logo,
  description,
  ctaLabel,
  ctaHref,
  navItems,
  videoSrc,
  asteriskHref,
  id,
  bare = false,
  onCtaClick,
  image,
  outlineWord,
  scrollHint = false,
}: PrismaHeroProps) => {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: delay * 0.5 } }
      : {
          initial: { y: 32, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 1, delay: delay + 0.3, ease: EASE },
        };

  return (
    <section id={id} className={`h-screen min-h-[560px] w-full ${bare ? "" : "p-2 md:p-3"}`} aria-label="소개">
      <div
        className={`relative h-full w-full ${bare ? "" : "overflow-hidden rounded-2xl bg-ink md:rounded-[2rem]"}`}
      >
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

        {/* Background photo (권한·출처 확인된 사진만) */}
        {!videoSrc && image && (
          <picture>
            <source type="image/webp" srcSet={image.webpSrcSet} sizes="100vw" />
            <img
              src={image.src}
              srcSet={image.jpgSrcSet}
              sizes="100vw"
              alt={image.alt}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-[50%_55%]"
            />
          </picture>
        )}

        {/* Noise overlay */}
        {!bare && <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />}

        {/* Gradient overlay */}
        {!bare && <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${
            image && !videoSrc ? "from-black/45 via-black/15 to-black/85" : "from-black/30 via-transparent to-black/60"
          }`}
        />}

        {/* Navbar */}
        {navItems && navItems.length > 0 && (
        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2" aria-label="주요 메뉴">
          <div className="flex items-center gap-3 surface-blur rounded-b-2xl border border-t-0 border-line bg-bar px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 lg:gap-14">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="whitespace-nowrap text-[11px] text-fg/70 transition-colors hover:text-fg sm:text-xs md:text-sm"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
        )}

        {/* 테두리만 있는 큰 장식 글자 (화면 읽기 프로그램에는 숨김) */}
        {outlineWord && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0.4 : 1.2, delay: 0.5, ease: EASE }}
            className="pointer-events-none absolute right-4 top-20 select-none font-num text-[24vw] leading-[0.8] tracking-[0.01em] text-transparent [-webkit-text-stroke:1.5px_rgb(225_224_204/0.95)] md:-bottom-[2vw] md:right-6 md:top-auto md:text-[17vw] md:[-webkit-text-stroke:2px_rgb(225_224_204/0.95)]"
          >
            {outlineWord}
          </motion.span>
        )}

        {/* SCROLL 안내: 글자 + 흘러내리는 선.
            가운데 아래는 데스크톱에서 TURTLES, 휴대폰에서 로고와 겹쳐서 → 데스크톱은 로고와 TURTLES 사이(화면 폭 40%), 휴대폰은 오른쪽 아래 */}
        {scrollHint && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 1.4 }}
            className="pointer-events-none absolute bottom-6 right-5 z-10 flex flex-col items-center gap-3 [filter:drop-shadow(0_1px_6px_rgb(0_0_0/0.55))] md:bottom-10 md:left-[40vw] md:right-auto"
          >
            <span className="font-num text-base tracking-[0.3em] text-cream">
              SCROLL
            </span>
            <span className="relative h-14 w-0.5 overflow-hidden rounded-full bg-cream/35">
              <span
                className={`absolute inset-x-0 top-0 h-1/2 bg-cream ${
                  reduce ? "" : "animate-[scroll-drip_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]"
                }`}
              />
            </span>
          </motion.div>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            <div className="col-span-12 lg:col-span-8">
              {logo ? (
                // 로고 그림은 floating-logo.tsx 가 화면에 고정해 그림 (스크롤하면 왼쪽 위로 이동). 여기는 제목 글만
                <h1 className="sr-only">{logo.alt}</h1>
              ) : (
              <h1 className="text-[26vw] font-medium leading-[0.85] tracking-[-0.07em] text-cream sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw]">
                <WordsPullUp text={title} showAsterisk asteriskHref={asteriskHref} />
              </h1>
              )}
            </div>

            {(description || (ctaLabel && ctaHref)) && (
            <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
              {description && (
              <motion.p
                {...enter(0.5)}
                className="text-sm font-medium text-cream md:text-base"
                style={{ lineHeight: 1.4, textShadow: '0 1px 2px rgb(0 0 0 / 0.85), 0 0 12px rgb(0 0 0 / 0.7), 0 0 32px rgb(0 0 0 / 0.5)' }}
              >
                {description}
              </motion.p>
              )}

              {ctaLabel && ctaHref && (
              <motion.a
                {...enter(0.7)}
                href={ctaHref}
                onClick={(e) => {
                  if (onCtaClick) {
                    e.preventDefault();
                    onCtaClick();
                  }
                }}
                className="group inline-flex items-center gap-2 self-start rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
              >
                {ctaLabel}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4 text-cream" aria-hidden="true" />
                </span>
              </motion.a>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
