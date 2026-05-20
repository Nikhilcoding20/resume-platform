'use client'

import Link from 'next/link'
import { pushGtmEvent } from '@/lib/gtmDataLayer'

export default function GetStartedFreeLink({ className, children }) {
  return (
    <Link
      href="/signup"
      className={className}
      onClick={() => pushGtmEvent('get_started_click')}
    >
      {children}
    </Link>
  )
}
