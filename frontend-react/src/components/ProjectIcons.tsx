import svgPaths from "../imports/svg-906ozfk2uo";

export function EditIcon({ className = "size-6" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} data-name="edit">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="edit">
          <mask
            height="24"
            id="mask0_1_650"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
            width="24"
            x="0"
            y="0"
          >
            <rect fill="var(--line)" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_1_650)">
            <path d={svgPaths.p3621f300} fill="currentColor" id="edit_2" />
          </g>
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
          <mask
            height="24"
            id="mask0_1_646"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
            width="24"
            x="0"
            y="0"
          >
            <rect fill="var(--line)" height="24" id="Bounding box" width="24" />
          </mask>
          <g mask="url(#mask0_1_646)">
            <path d={svgPaths.pa683700} fill="currentColor" id="delete_2" />
          </g>
        </g>
      </svg>
    </div>
  );
}