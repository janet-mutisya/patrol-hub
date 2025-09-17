import React from "react";
import { Button } from "@/components/ui/button";

const QuickActionButton = ({ title, icon: Icon, color, onClick }) => {
  return (
    <Button
      onClick={onClick}
      className={`flex items-center space-x-2 bg-${color}-500 hover:bg-${color}-600 text-white px-4 py-2 rounded-lg`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{title}</span>
    </Button>
  );
};

export default QuickActionButton;
