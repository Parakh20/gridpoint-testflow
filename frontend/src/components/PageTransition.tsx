import { ReactNode } from 'react';
import { motion } from 'framer-motion';

const variants = {
  initial:  { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate:  { opacity: 1, y: 0,  filter: 'blur(0px)' },
  exit:     { opacity: 0, y: -6, filter: 'blur(2px)' },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
