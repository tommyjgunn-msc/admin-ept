// components/TestPreviews/WritingPreview.js
//
// Was raw Tailwind defaults — `bg-gray-50`, `text-gray-500`, bare `border` —
// which rendered as light-grey boxes with invisible rules inside a dark
// console. It now mirrors the candidate's writing section: prompt at a reading
// measure, then the paper writing surface framed by dark chrome.
export function WritingPreview({ prompt }) {
  return (
    <div>
      <p className="font-inter font-bold text-[11px] tracking-[.14em] uppercase text-ftm-dim mb-2">
        {prompt.type} essay
      </p>
      <div className="font-inter text-[17px] leading-[1.7] text-ftm-ink max-w-measure mb-4 whitespace-pre-wrap">
        {prompt.text}
      </div>
      <p className="font-inter text-[13px] text-ftm-mut pb-6 mb-8 border-b border-ftm-line">
        Word limit <span className="tabular-nums font-semibold text-ftm-ink">{prompt.wordLimit}</span>
      </p>

      <div className="border border-ftm-line2">
        <textarea
          className="block w-full h-64 px-8 py-8 border-0 resize-none bg-ftm-paper text-ftm-night placeholder-ftm-mutl"
          style={{ fontSize: '17px', lineHeight: '1.8', colorScheme: 'light' }}
          placeholder="The candidate writes here."
          aria-label="Preview of the candidate's writing area"
          disabled
        />
      </div>
    </div>
  );
}
