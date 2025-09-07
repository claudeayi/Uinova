// src/components/ui/FadeInCard.tsx
import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface FadeInCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  hover?: boolean;
  onClick?: () => void;
  role?: "button" | "region";
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export default function FadeInCard({
  children,
  className,
  delay = 0,
  duration = 0.4,
  hover = false,
  onClick,
  role,
}: FadeInCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      transition={{ duration, delay, ease: "easeOut" }}
      onClick={onClick}
      role={role}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md",
        hover &&
          "transition-transform hover:scale-[1.02] hover:shadow-lg cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
