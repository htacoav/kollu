import { Fragment } from 'react'

/**
 * Headline that reveals word by word, each word rising out of its own mask
 * (Apple-style). `*word*` marks the accent colour, `\n` a line break.
 * Revealed once by the page-wide IntersectionObserver (`data-reveal`).
 */
export default function Words({ as: Tag = 'h2', text, className = '', delay = 0, ...rest }) {
  let i = 0
  const plain = text.replace(/\*/g, '').replace(/\n/g, ' ')
  return (
    <Tag className={`words ${className}`} data-reveal aria-label={plain} {...rest}>
      {text.split('\n').map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line
            .split(' ')
            .filter(Boolean)
            .map((w, wi) => {
              const accent = w.includes('*')
              const n = i++
              return (
                <Fragment key={wi}>
                  <span className="w" aria-hidden="true">
                    <span className={`w__i${accent ? ' accent' : ''}`} style={{ '--i': n + delay }}>
                      {w.replace(/\*/g, '')}
                    </span>
                  </span>{' '}
                </Fragment>
              )
            })}
        </Fragment>
      ))}
    </Tag>
  )
}
