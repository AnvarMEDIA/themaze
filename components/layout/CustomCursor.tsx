'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const dotRef    = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springX = useSpring(mouseX, { stiffness: 500, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 500, damping: 30 })

  const lagX = useSpring(mouseX, { stiffness: 100, damping: 28 })
  const lagY = useSpring(mouseY, { stiffness: 100, damping: 28 })

  const [variant, setVariant] = useState<'default' | 'hover' | 'view' | 'drag'>('default')

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    const onHoverIn = (e: Event) => {
      const target = e.currentTarget as HTMLElement
      const cursorType = target.dataset.cursor
      if (cursorType === 'view')       setVariant('view')
      else if (cursorType === 'drag')  setVariant('drag')
      else                             setVariant('hover')
    }
    const onHoverOut = () => setVariant('default')

    window.addEventListener('mousemove', onMove)

    const interactives = document.querySelectorAll<HTMLElement>(
      'a, button, [data-cursor]'
    )
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', onHoverIn)
      el.addEventListener('mouseleave', onHoverOut)
    })

    const observer = new MutationObserver(() => {
      const fresh = document.querySelectorAll<HTMLElement>(
        'a, button, [data-cursor]'
      )
      fresh.forEach((el) => {
        el.removeEventListener('mouseenter', onHoverIn)
        el.removeEventListener('mouseleave', onHoverOut)
        el.addEventListener('mouseenter', onHoverIn)
        el.addEventListener('mouseleave', onHoverOut)
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onHoverIn)
        el.removeEventListener('mouseleave', onHoverOut)
      })
      observer.disconnect()
    }
  }, [mouseX, mouseY])

  const variants = {
    default: { width: 12, height: 12, backgroundColor: '#C8FF47', mixBlendMode: 'normal' as const },
    hover:   { width: 40, height: 40, backgroundColor: '#C8FF47', mixBlendMode: 'difference' as const },
    view:    { width: 80, height: 80, backgroundColor: '#C8FF47', mixBlendMode: 'normal' as const },
    drag:    { width: 64, height: 64, backgroundColor: '#EDEBE3', mixBlendMode: 'normal' as const },
  }

  return (
    <>
      {/* Dot — snaps to mouse */}
      <motion.div
        ref={dotRef}
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9999]"
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
        animate={variant}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        {...variants[variant]}
      >
        {variant === 'view' && (
          <span className="absolute inset-0 flex items-center justify-center text-[#080808] text-[10px] font-bold tracking-widest uppercase">
            View
          </span>
        )}
        {variant === 'drag' && (
          <span className="absolute inset-0 flex items-center justify-center text-[#080808] text-[9px] font-bold tracking-widest uppercase">
            Drag
          </span>
        )}
      </motion.div>

      {/* Ring — lags behind */}
      <motion.div
        ref={cursorRef}
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9998] border border-[#5A5A5A]"
        style={{
          x: lagX,
          y: lagY,
          translateX: '-50%',
          translateY: '-50%',
          width: variant === 'default' ? 36 : 0,
          height: variant === 'default' ? 36 : 0,
        }}
        animate={{ opacity: variant === 'default' ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </>
  )
}
