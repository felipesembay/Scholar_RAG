import svgPaths from "../imports/svg-nmqv12a7zx";
import svgPathsFaq from "../imports/svg-5hunh2r6fd";

export function WorkspacesIcon({ className = "size-5" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="workspaces">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="workspaces">
          <mask
            height="20"
            id="mask0_1_359"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
            width="20"
            x="0"
            y="0"
          >
            <rect fill="var(--line)" height="20" id="Bounding box" width="20" />
          </mask>
          <g mask="url(#mask0_1_359)">
            <path d={svgPaths.p1bb5cff0} fill="currentColor" id="workspaces_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function ForumIcon({ className = "size-5" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="forum">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="forum">
          <mask
            height="20"
            id="mask0_1_363"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
            width="20"
            x="0"
            y="0"
          >
            <rect fill="var(--line)" height="20" id="Bounding box" width="20" />
          </mask>
          <g mask="url(#mask0_1_363)">
            <path d={svgPaths.p3e72cf40} fill="currentColor" id="forum_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function PlusIcon({ className = "size-6" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="plus">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="plus">
          <path 
            d="M12 5V19M5 12H19" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function EditIcon({ className = "size-6" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="edit">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="edit">
          <path 
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function DeleteIcon({ className = "size-6" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="delete">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="delete">
          <path 
            d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <line 
            x1="10" 
            y1="11" 
            x2="10" 
            y2="17" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <line 
            x1="14" 
            y1="11" 
            x2="14" 
            y2="17" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function SearchIcon({ className = "size-5" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="search">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="search">
          <circle 
            cx="11" 
            cy="11" 
            r="8" 
            stroke="currentColor" 
            strokeWidth="2"
          />
          <path 
            d="m21 21-4.35-4.35" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
