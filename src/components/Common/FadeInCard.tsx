import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function FadeInCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 p-4 rounded shadow"
    >
      {children}
    </motion.div>
  );
}
