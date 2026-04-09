import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface HoverCardProps {
  children: ReactNode;
  className?: string;
}

export function HoverCard({ children, className = '' }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
