// src/components/ui/Card.tsx
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface CardProps {
  title: string;
  description: string;
  image?: string;
  footer?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
}

export default function Card({
  title,
  description,
  image,
  footer,
  children,
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      role="article"
      aria-label={title}
      className="card group bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Image */}
      {image && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* Contenu */}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>

        {/* Slot libre */}
        {children && <div className="pt-2">{children}</div>}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-2 border-t dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
