import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdminDoctorMultistepForm from '../components/admin/doctor-registration/AdminDoctorMultistepForm'

export default function AdminAddDoctorPage() {
  const [error, setError] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/doctors"
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-accent transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to doctors
        </Link>
        <h2 className="text-2xl font-bold">Register Doctor</h2>
        <p className="text-white/50 text-sm mt-1">
          Add a new doctor to the system. They will receive an email to set their password.
        </p>
      </div>

      <AdminDoctorMultistepForm onError={setError} />

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  )
}
