import React from "react";

const TableOfContents = ({ toc, onNavigate, currentHref, isOpen, onClose }) => {
  if (!isOpen) return null;

  const renderTocItems = (items, level = 0) => {
    return items.map((item, index) => (
      <div key={index} style={{ paddingLeft: `${level * 1}rem` }}>
        <button
          onClick={() => {
            onNavigate(item.href);
            onClose();
          }}
          className={`w-full text-left px-4 py-2 hover:bg-surface-10 transition-colors ${
            currentHref === item.href
              ? "bg-primary-10 text-primary font-semibold"
              : "text-secondary"
          }`}
        >
          {item.label}
        </button>
        {item.subitems && item.subitems.length > 0 && (
          <div className="ml-2">{renderTocItems(item.subitems, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-surface-0 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-surface-10 border-b border-surface-20 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            Table of Contents
          </h3>
          <button onClick={onClose} className="btn-icon w-8 h-8" title="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* TOC Content */}
        <div className="flex-1 overflow-y-auto">
          {toc && toc.length > 0 ? (
            <div className="py-2">{renderTocItems(toc)}</div>
          ) : (
            <div className="p-6 text-center text-muted">
              <p>No table of contents available</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TableOfContents;
