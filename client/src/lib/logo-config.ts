import logoImage from "@/assets/logo2.png";

export { logoImage };

export type LogoSize = "normal" | "large";

export const LOGO_SIZE: LogoSize = "large";

export const logoSizeClasses = {
  header: {
    normal: "h-14 w-auto",
    large: "h-20 w-auto",
  },
  auth: {
    normal: "h-16 w-auto",
    large: "h-28 w-auto",
  },
  footer: {
    normal: "h-12 w-auto",
    large: "h-[72px] w-auto",
  },
} as const;

export const getLogoClass = (variant: "header" | "auth" | "footer") => {
  return logoSizeClasses[variant][LOGO_SIZE];
};

export const logoContainerClass = "inline-flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-900/90 p-2 backdrop-blur-sm";
