// components/TestPreviews/ReadingPreview.js
//
// Was raw Tailwind defaults — `bg-gray-50` panels and bare `border` with no
// colour — so this preview rendered as light-grey boxes with invisible rules
// inside a dark console, and looked nothing like the screen it was previewing.
// It now matches the candidate's reading section: passage at a reading measure,
// questions ruled and numbered, options as real radios.
export function ReadingPreview({ section }) {
  return (
    <div className="space-y-12">
      <div>
        <h3 className="font-grotesk font-bold text-[21px] text-ftm-ink pb-3 mb-6 border-b-2 border-ftm-line2">
          {section.title}
        </h3>
        <div className="font-inter text-[17px] leading-[1.7] text-ftm-ink max-w-measure whitespace-pre-wrap">
          {section.content}
        </div>
      </div>

      <ol className="list-none p-0 m-0">
        {section.questions.map((question, index) => (
          <li key={index} className="border-t border-ftm-line py-6">
            <fieldset>
              <legend className="font-inter font-semibold text-[16px] leading-relaxed text-ftm-ink mb-4 max-w-measure">
                <span className="text-ftm-dim tabular-nums mr-2">{index + 1}.</span>
                {question.text}
              </legend>
              <div className="max-w-measure">
                {question.options.map((option, optIndex) => (
                  <label
                    key={optIndex}
                    className="flex items-start gap-4 py-2.5 border-b border-ftm-line opacity-70"
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      disabled
                      className="w-5 h-5 accent-[#C5132D] mt-0.5 flex-none"
                    />
                    <span className="font-inter text-[16px] leading-relaxed text-ftm-mut">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
    </div>
  );
}
