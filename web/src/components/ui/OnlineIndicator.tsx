interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const OnlineIndicator = ({
  isOnline,
  size = "sm",
  showText = false,
  className = "",
}: OnlineIndicatorProps) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const dotClass = `${sizeClasses[size]} rounded-full ${
    isOnline ? "bg-green-400" : "bg-gray-400"
  }`;

  if (showText) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className={dotClass}></span>
        <span
          className={`text-xs ${isOnline ? "text-green-600" : "text-gray-500"}`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    );
  }

  return <span className={`${dotClass} ${className}`}></span>;
};
