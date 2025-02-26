import React from "react";
import { Link } from "react-router-dom";

const ToolComponent = ({ title, description, icon, link }) => {
  // Helper function to determine how to render the icon.
  const renderIcon = () => {
    if (typeof icon === "string") {
      // If the string starts with "http", "data:" or ends with a common image extension,
      // assume it's an image URL/data URI and render an image.
      if (
        icon.startsWith("http") ||
        icon.startsWith("data:") ||
        icon.endsWith(".png") ||
        icon.endsWith(".jpg") ||
        icon.endsWith(".jpeg") ||
        icon.endsWith(".svg")
      ) {
        return <img src={icon} alt="icon" className="w-7 h-7 flex-shrink-0" />;
      } else {
        // Otherwise, assume it's text or an emoji and render it in a span.
        return <span className="text-2xl">{icon}</span>;
      }
    }
    // If the icon is not a string, assume it's a React element and render it as-is.
    return icon;
  };

  return (
    <Link
      to={link}
      className="flex items-center gap-3 w-64 h-16 
        bg-[#1F2937] text-[#e5e7eb] rounded-lg shadow-md 
        transition-transform hover:scale-105 hover:shadow-xl cursor-pointer 
        overflow-hidden px-4 py-2"
    >
      {icon && (
        <div className="flex items-center justify-center h-full">
          {renderIcon()}
        </div>
      )}

      <div className="flex flex-col flex-1 justify-between h-full">
        <h3 className="text-md font-bold text-[#ebb305] leading-tight">
          {title}
        </h3>
        <p className="text-xs text-[#9ca3af] leading-tight">{description}</p>
      </div>
    </Link>
  );
};

export default ToolComponent;
