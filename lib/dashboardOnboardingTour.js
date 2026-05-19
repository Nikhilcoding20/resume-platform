import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

const NAV_TOUR_IDS = {
  resumeBuilder: 'resume-builder',
  atsChecker: 'ats-checker',
  coverLetter: 'cover-letter',
  jobBoard: 'job-board',
}

function visibleNavElement(tourId) {
  const nodes = document.querySelectorAll(`[data-tour-nav="${tourId}"]`)
  return (
    Array.from(nodes).find((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }) || null
  )
}

function attachToNav(tourId) {
  return {
    element: () => visibleNavElement(tourId),
    on: 'bottom',
  }
}

function isMobileNav() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

function openMobileNavForTour() {
  window.dispatchEvent(new CustomEvent('dashboard-onboarding-open-nav'))
}

function waitForNavTarget(tourId, attempts = 24, intervalMs = 50) {
  return new Promise((resolve) => {
    let n = 0
    const tick = () => {
      const el = visibleNavElement(tourId)
      if (el) {
        resolve(el)
        return
      }
      n += 1
      if (n >= attempts) {
        resolve(el || null)
        return
      }
      setTimeout(tick, intervalMs)
    }
    tick()
  })
}

function navStepBeforeShow(tourId) {
  return async () => {
    if (isMobileNav()) openMobileNavForTour()
    await waitForNavTarget(tourId)
  }
}

function stepButtons(tour, { isLast = false } = {}) {
  return [
    {
      text: 'Skip',
      classes: 'shepherd-button-secondary',
      action() {
        tour.cancel()
      },
    },
    {
      text: isLast ? 'Done' : 'Next',
      action() {
        if (isLast) tour.complete()
        else tour.next()
      },
    },
  ]
}

/**
 * @param {{ onComplete: () => void | Promise<void> }} options
 */
export function startDashboardOnboardingTour({ onComplete }) {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: false },
      classes: 'uc-onboarding-step',
      scrollTo: { behavior: 'smooth', block: 'center' },
    },
  })

  const finish = async () => {
    try {
      await onComplete()
    } catch (e) {
      console.error('[dashboard-onboarding]', e)
    }
  }

  tour.on('complete', finish)
  tour.on('cancel', finish)

  tour.addStep({
    id: 'welcome',
    title: 'Welcome',
    text: "Welcome to Unemployed Club! Let's show you around.",
    buttons: stepButtons(tour),
  })

  tour.addStep({
    id: 'resume-builder',
    title: 'Resume Builder',
    text: 'Build and tailor ATS-friendly resumes for every job application.',
    attachTo: attachToNav(NAV_TOUR_IDS.resumeBuilder),
    beforeShowPromise: navStepBeforeShow(NAV_TOUR_IDS.resumeBuilder),
    buttons: stepButtons(tour),
  })

  tour.addStep({
    id: 'ats-checker',
    title: 'ATS Checker',
    text: 'Score your resume against a job description and get actionable fixes.',
    attachTo: attachToNav(NAV_TOUR_IDS.atsChecker),
    beforeShowPromise: navStepBeforeShow(NAV_TOUR_IDS.atsChecker),
    buttons: stepButtons(tour),
  })

  tour.addStep({
    id: 'cover-letter',
    title: 'Cover Letter',
    text: 'Generate personalized cover letters that match your resume and the role.',
    attachTo: attachToNav(NAV_TOUR_IDS.coverLetter),
    beforeShowPromise: navStepBeforeShow(NAV_TOUR_IDS.coverLetter),
    buttons: stepButtons(tour),
  })

  tour.addStep({
    id: 'job-board',
    title: 'Job Board',
    text: 'Browse roles and keep your search organized in one place.',
    attachTo: attachToNav(NAV_TOUR_IDS.jobBoard),
    beforeShowPromise: navStepBeforeShow(NAV_TOUR_IDS.jobBoard),
    buttons: stepButtons(tour),
  })

  tour.addStep({
    id: 'finish',
    title: "You're all set",
    text: "You're all set! Start by building your first resume.",
    buttons: stepButtons(tour, { isLast: true }),
  })

  tour.start()
  return tour
}
