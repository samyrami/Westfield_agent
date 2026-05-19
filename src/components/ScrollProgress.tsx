import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Barra de progreso de scroll de 3px con gradient + glow,
 * fija arriba. Replica la del sitio original.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-50 h-[3px] origin-left bg-gradient-primary shadow-glow"
    />
  );
}
