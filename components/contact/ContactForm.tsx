'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

const services = [
  'Brand Identity',
  'Brand Strategy',
  'UI / UX Design',
  'Print & Packaging',
  'Motion Design',
  'Art Direction',
  'Not sure yet',
]

const budgets = [
  'Under $2,000',
  '$2,000 – $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000+',
]

export function ContactForm() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', company: '', service: '', budget: '', message: '',
  })

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate submission (replace with your email service / API route)
    await new Promise((r) => setTimeout(r, 1200))

    toast.success('Message sent! We\'ll be in touch within 24 hours.', {
      duration: 5000,
    })
    setForm({ name: '', email: '', company: '', service: '', budget: '', message: '' })
    setLoading(false)
  }

  const inputClass =
    'w-full bg-transparent border border-maze-border rounded-lg px-4 py-3.5 body-lg text-maze-cream placeholder:text-maze-muted focus:outline-none focus:border-maze-lime transition-colors duration-200'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-sm text-maze-muted block mb-2">Your name *</label>
          <input
            type="text"
            required
            placeholder="Anvar Yusupov"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-sm text-maze-muted block mb-2">Email *</label>
          <input
            type="email"
            required
            placeholder="hello@company.uz"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="label-sm text-maze-muted block mb-2">Company / Project</label>
        <input
          type="text"
          placeholder="Your company or project name"
          value={form.company}
          onChange={(e) => set('company', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Service */}
      <div>
        <label className="label-sm text-maze-muted block mb-2">Service interested in *</label>
        <select
          required
          value={form.service}
          onChange={(e) => set('service', e.target.value)}
          className={inputClass + ' appearance-none'}
        >
          <option value="" disabled>Select a service</option>
          {services.map((s) => (
            <option key={s} value={s} className="bg-maze-dark">{s}</option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div>
        <label className="label-sm text-maze-muted block mb-3">Approximate budget</label>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set('budget', b)}
              className={`label-sm px-4 py-2 border rounded-full transition-all duration-200 ${
                form.budget === b
                  ? 'border-maze-lime text-maze-black bg-maze-lime'
                  : 'border-maze-border text-maze-muted hover:border-maze-cream hover:text-maze-cream'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="label-sm text-maze-muted block mb-2">Tell us about your project *</label>
        <textarea
          required
          rows={5}
          placeholder="Describe your project, goals, timeline, and any other relevant details..."
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          className={inputClass + ' resize-none'}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-maze-lime text-maze-black font-bold rounded-full hover:bg-white transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed label-sm"
      >
        {loading ? 'Sending…' : 'Send message ↗'}
      </button>

      <p className="label-sm text-maze-muted text-center">
        We respond to all enquiries within 24 hours.
      </p>
    </form>
  )
}
