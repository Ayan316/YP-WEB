'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  MapPin,
  Phone,
  User,
  Send,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { submitContactUs } from '@/services/contactus.services'

const MESSAGE_LIMIT = 450

const contactInfo = {
  email: 'info@youngprofessionals.global',
  addressLine1: 'Young Professionals UK — Inspiring a New Generation Ltd',
  addressLine2: '6 Bevis Marks, City of London, London EC3A 7BA, UK',
}

const mapSrc =
  'https://www.google.com/maps?q=6%20Bevis%20Marks%2C%20City%20of%20London%2C%20London%20EC3A%207BA&z=15&output=embed'

const mapsLink =
  'https://www.google.com/maps/search/?api=1&query=6+Bevis+Marks,+City+of+London,+London+EC3A+7BA'

const socials = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/youngprouk',
    color: '#E4405F',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.81.72 1.49 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.15A4 4 0 1 1 16 12a4 4 0 0 1-4 3.99Zm7.85-10.4a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44Z',
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/young-professionals-uk',
    color: '#0A66C2',
    path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/youngprouk',
    color: '#1877F2',
    path: 'M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95H15.83c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z',
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@youngprouk',
    color: 'currentColor',
    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 1 1-2.31-2.84v-3.5a6.37 6.37 0 1 0 5.76 6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06Z',
  },
]

const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .regex(/^[A-Za-zÀ-ɏ' -]+$/, 'Please use letters only'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .regex(/^[A-Za-zÀ-ɏ' -]+$/, 'Please use letters only'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  contactNumber: z
    .string()
    .trim()
    .min(1, 'Contact number is required')
    .regex(/^[+\d\s()-]+$/, 'Please enter a valid contact number')
    .refine((v) => {
      const digits = v.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15
    }, 'Contact number must be 7–15 digits'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(MESSAGE_LIMIT, `Message must be ${MESSAGE_LIMIT} characters or less`),
})

type ContactFormValues = z.infer<typeof contactSchema>

const jakarta = { fontFamily: 'var(--font-plus-jakarta)' }
const dmSans = { fontFamily: 'var(--font-dm-sans)' }

export default function ContactUs() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, touchedFields },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      message: '',
    },
  })

  const messageValue = watch('message') || ''

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true)
    try {
      await submitContactUs({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_no: data.contactNumber,
        message: data.message,
      })
      toast.success('Message sent successfully!')
      reset()
      setIsSent(true)
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldValid = (name: keyof ContactFormValues) =>
    touchedFields[name] && !errors[name] && !!watch(name)

  const inputClasses = (hasError?: boolean) =>
    [
      'w-full rounded-xl border pl-11 pr-10 py-3 text-sm outline-none transition-all duration-200',
      'bg-white text-[#1c2433] placeholder:text-[#9aa3b8]',
      'dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30',
      hasError
        ? 'border-red-400/80 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 dark:border-red-500/60'
        : 'border-[#D5DAE8] focus:border-[#5433FF]/60 focus:ring-4 focus:ring-[#5433FF]/10 dark:border-white/10 dark:focus:border-[#20BDFF]/50 dark:focus:ring-[#20BDFF]/10',
    ].join(' ')

  return (
    <div className="cu_page w-full max-w-[1200px] mx-auto px-4 md:px-0 py-8 md:py-12">
      {/* ---------- Hero ---------- */}
      <header className="cu_rise text-center mb-10 md:mb-14" style={{ animationDelay: '0ms' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-[#A0AEC0]/50 bg-[#F4F6FF] dark:bg-white/[0.05] dark:border-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#5433FF] dark:text-[#7fd4ff]"
          style={jakarta}
        >
          <span className="cu_pulse inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#5433FF] to-[#20BDFF]" />
          Get in touch
        </span>
        <h1
          className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-[#101728] dark:text-white"
          style={jakarta}
        >
          Let&apos;s start a{' '}
          <span className="cu_gradient_text">conversation</span>
        </h1>
        <p
          className="mt-4 max-w-2xl mx-auto text-sm md:text-base leading-relaxed text-[#5b6477] dark:text-gray-400"
          style={dmSans}
        >
          Spotted a problem, got an idea, or just want to say hello? Tell us below —
          we read everything and we&apos;ll get back to you as quickly as we can.
          Thanks for being part of the Young Professionals story.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ---------- Left: contact channels + map ---------- */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Email card */}
          <a
            href={`mailto:${contactInfo.email}`}
            className="cu_rise cu_card group block rounded-2xl border border-[#A0AEC0]/50 bg-[#F4F6FF] dark:bg-[#020c1954] dark:border-white/10 p-5"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex items-start gap-4">
              <span className="cu_chip flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                <Mail size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#101728] dark:text-white" style={jakarta}>
                    Email us
                  </h3>
                  <ArrowUpRight
                    size={16}
                    className="text-[#9aa3b8] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#5433FF] dark:group-hover:text-[#20BDFF]"
                  />
                </div>
                <p className="mt-1 truncate text-sm text-[#5433FF] dark:text-[#7fd4ff]" style={dmSans}>
                  {contactInfo.email}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8a93a6] dark:text-gray-500" style={dmSans}>
                  <Clock size={12} /> We usually reply within 1–2 working days
                </p>
              </div>
            </div>
          </a>

          {/* Address card — opens Google Maps in a new tab */}
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="cu_rise cu_card group block rounded-2xl border border-[#A0AEC0]/50 bg-[#F4F6FF] dark:bg-[#020c1954] dark:border-white/10 p-5"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex items-start gap-4">
              <span className="cu_chip flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                <MapPin size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#101728] dark:text-white" style={jakarta}>
                    Visit us
                  </h3>
                  <ArrowUpRight
                    size={16}
                    className="text-[#9aa3b8] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#5433FF] dark:group-hover:text-[#20BDFF]"
                  />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#5b6477] dark:text-gray-300" style={dmSans}>
                  {contactInfo.addressLine1}
                  <br />
                  {contactInfo.addressLine2}
                </p>
              </div>
            </div>
          </a>

          {/* Map — stretches to keep both columns equal height */}
          <div
            className="cu_rise cu_card relative flex-1 min-h-[280px] overflow-hidden rounded-2xl border border-[#A0AEC0]/50 dark:border-white/10"
            style={{ animationDelay: '240ms' }}
          >
            <iframe
              src={mapSrc}
              className="absolute inset-0 h-full w-full border-0 dark:invert-[0.92] dark:hue-rotate-180 dark:contrast-[0.9]"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Young Professionals UK — 6 Bevis Marks, City of London"
            />
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 rounded-lg bg-white/90 dark:bg-[#040f1f]/90 px-3 py-1.5 text-xs font-semibold text-[#101728] dark:text-white backdrop-blur-sm transition-colors hover:text-[#5433FF] dark:hover:text-[#20BDFF]"
              style={jakarta}
            >
              📍 6 Bevis Marks, City of London
            </a>
          </div>
        </div>

        {/* ---------- Right: form ---------- */}
        <div
          className="cu_rise lg:col-span-7 relative overflow-hidden rounded-2xl border border-[#A0AEC0]/50 bg-[#F4F6FF] dark:bg-[#020c1954] dark:border-white/10 p-6 md:p-8"
          style={{ animationDelay: '120ms' }}
        >
          {/* gradient top edge */}
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#5433FF] via-[#3a7bff] to-[#20BDFF]" />

          {isSent ? (
            /* ---------- Success state ---------- */
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center py-10">
              <span className="cu_pop flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5433FF] to-[#20BDFF] text-white shadow-lg shadow-[#20BDFF]/25">
                <CheckCircle2 size={32} />
              </span>
              <h2 className="mt-6 text-2xl font-extrabold text-[#101728] dark:text-white" style={jakarta}>
                Message sent!
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#5b6477] dark:text-gray-400" style={dmSans}>
                Thanks for reaching out — we&apos;ve got your message and we&apos;ll
                be in touch within 1–2 working days.
              </p>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="mt-8 cursor-pointer rounded-xl border border-[#5433FF]/40 dark:border-[#20BDFF]/40 px-6 py-2.5 text-sm font-semibold text-[#5433FF] dark:text-[#7fd4ff] transition-colors hover:bg-[#5433FF]/5 dark:hover:bg-[#20BDFF]/10"
                style={jakarta}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-[#101728] dark:text-white" style={jakarta}>
                Send us a message
              </h2>
              <p className="mt-1 mb-6 text-sm text-[#8a93a6] dark:text-gray-400" style={dmSans}>
                We&apos;re always here to help out whatever way we can.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* First name */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d4659] dark:text-gray-300"
                      style={dmSans}
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa3b8] dark:text-white/30" />
                      <input
                        id="firstName"
                        placeholder="First name"
                        autoComplete="given-name"
                        aria-invalid={!!errors.firstName}
                        className={inputClasses(!!errors.firstName)}
                        style={dmSans}
                        {...register('firstName')}
                      />
                      {fieldValid('firstName') && (
                        <CheckCircle2 size={16} className="cu_pop absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Last name */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d4659] dark:text-gray-300"
                      style={dmSans}
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa3b8] dark:text-white/30" />
                      <input
                        id="lastName"
                        placeholder="Last name"
                        autoComplete="family-name"
                        aria-invalid={!!errors.lastName}
                        className={inputClasses(!!errors.lastName)}
                        style={dmSans}
                        {...register('lastName')}
                      />
                      {fieldValid('lastName') && (
                        <CheckCircle2 size={16} className="cu_pop absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d4659] dark:text-gray-300"
                    style={dmSans}
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa3b8] dark:text-white/30" />
                    <input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      className={inputClasses(!!errors.email)}
                      style={dmSans}
                      {...register('email')}
                    />
                    {fieldValid('email') && (
                      <CheckCircle2 size={16} className="cu_pop absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="contactNumber"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d4659] dark:text-gray-300"
                    style={dmSans}
                  >
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa3b8] dark:text-white/30" />
                    <input
                      id="contactNumber"
                      type="tel"
                      placeholder="Phone number"
                      autoComplete="tel"
                      aria-invalid={!!errors.contactNumber}
                      className={inputClasses(!!errors.contactNumber)}
                      style={dmSans}
                      {...register('contactNumber')}
                    />
                    {fieldValid('contactNumber') && (
                      <CheckCircle2 size={16} className="cu_pop absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-xs font-semibold tracking-wide text-[#3d4659] dark:text-gray-300"
                    style={dmSans}
                  >
                    Message <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare size={16} className="pointer-events-none absolute left-4 top-4 text-[#9aa3b8] dark:text-white/30" />
                    <textarea
                      id="message"
                      rows={6}
                      placeholder="How can we help you?"
                      maxLength={MESSAGE_LIMIT}
                      aria-invalid={!!errors.message}
                      className={`${inputClasses(!!errors.message)} min-h-[150px] resize-none`}
                      style={dmSans}
                      {...register('message')}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-end">
                    <span
                      className={`text-xs tabular-nums ${
                        messageValue.length >= MESSAGE_LIMIT
                          ? 'text-red-500'
                          : 'text-[#8a93a6] dark:text-gray-500'
                      }`}
                      style={dmSans}
                    >
                      {messageValue.length}/{MESSAGE_LIMIT}
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cu_submit group relative mt-1 w-full cursor-pointer overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    ...jakarta,
                    background: 'linear-gradient(91.37deg, #5433FF 3.68%, #20BDFF 95.65%)',
                  }}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <span className="cu_spinner h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send size={15} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                      </>
                    )}
                  </span>
                  {/* hover sheen */}
                  <span className="cu_sheen absolute inset-0" aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ---------- Socials ---------- */}
      <div className="cu_rise mt-12" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-[#D5DAE8] dark:bg-white/10" />
          <span className="text-sm text-[#8a93a6] dark:text-gray-500" style={dmSans}>
            or find us on
          </span>
          <span className="h-px flex-1 bg-[#D5DAE8] dark:bg-white/10" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              title={s.name}
              className="cu_card flex h-12 w-12 items-center justify-center rounded-full border border-[#D5DAE8] bg-white text-[#0f1419] dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={s.color} aria-hidden="true">
                <path d={s.path} />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* scoped animations */}
      <style>{`
        .cu_rise {
          opacity: 0;
          animation: cuRise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes cuRise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cu_pop {
          animation: cuPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes cuPop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .cu_pop.absolute {
          animation: cuPopCentered 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes cuPopCentered {
          from { opacity: 0; transform: translateY(-50%) scale(0.5); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
        .cu_pulse {
          animation: cuPulse 2s ease-in-out infinite;
        }
        @keyframes cuPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        .cu_gradient_text {
          background: linear-gradient(91.37deg, #5433ff 3.68%, #20bdff 95.65%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .cu_chip {
          background: linear-gradient(135deg, #5433ff, #20bdff);
          box-shadow: 0 6px 16px -6px rgba(84, 51, 255, 0.5);
        }
        .cu_card {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .cu_card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px -12px rgba(84, 51, 255, 0.25);
          border-color: rgba(84, 51, 255, 0.35);
        }
        .dark .cu_card:hover {
          box-shadow: 0 12px 32px -12px rgba(32, 189, 255, 0.2);
          border-color: rgba(32, 189, 255, 0.3);
        }
        .cu_sheen {
          background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%);
          transform: translateX(-100%);
        }
        .cu_submit:hover .cu_sheen {
          animation: cuSheen 0.8s ease forwards;
        }
        @keyframes cuSheen {
          to { transform: translateX(100%); }
        }
        .cu_spinner {
          animation: cuSpin 0.7s linear infinite;
        }
        @keyframes cuSpin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cu_rise, .cu_pop, .cu_pulse { animation: none; opacity: 1; }
          .cu_card, .cu_submit { transition: none; }
        }
      `}</style>
    </div>
  )
}
