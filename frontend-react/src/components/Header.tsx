export default function Header() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-end relative size-full">
        <div className="box-border content-stretch flex flex-row gap-2.5 items-center justify-end pb-0 pt-4 px-4 relative w-full">
          <div className="bg-primary-soft box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-2 py-1 relative rounded-xl shrink-0">
            <div
              className=" font-bold leading-[0] relative shrink-0 text-primary text-[16px] text-center text-nowrap"
              style={{ fontVariationSettings: "'wdth' 100" }}
            >
              <p className="block leading-[normal] whitespace-pre">[Nome do usuário]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}