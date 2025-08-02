'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface ParcelEntry {
  id?: number
  taskId: string
  sellerId: string
  courier: 'SPX' | 'Flash'
  quantity: number
  pickedUpSameDay: boolean
  date: string
  totalEarning: number
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [entries, setEntries] = useState<ParcelEntry[]>([])
  const [formData, setFormData] = useState<ParcelEntry>({
    taskId: '',
    sellerId: '',
    courier: 'SPX',
    quantity: 0,
    pickedUpSameDay: false,
    date: new Date().toISOString().split('T')[0],
    totalEarning: 0
  })
  const [dateFilter, setDateFilter] = useState('today')
  const [loading, setLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Parcel Report - L&A Logistics'
  })
  const [sending, setSending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/')
      return
    }

    setUser(JSON.parse(userData))
    fetchEntries()
  }, [dateFilter])

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/backend/parcels?filter=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    }
  }

  const calculateEarning = (courier: string, quantity: number, pickedUpSameDay: boolean) => {
    if (courier === 'SPX') {
      // SPX Pricing (Based on official memo June 1, 2025):
      // - Only first 100 parcels per Shop ID per day are incentivized
      // - Base Rate: ₱0.50 per incentivized parcel (guaranteed)
      // - Bonus Rate: ₱0.50 per incentivized parcel (if picked up same day)
      // - Example: 150 parcels, picked up same day = (100 × ₱0.50) + (100 × ₱0.50) = ₱100.00
      
      const incentivizedParcels = Math.min(quantity, 100)
      
      // Base Rate: ₱0.50 per parcel (guaranteed)
      const baseRate = incentivizedParcels * 0.5
      
      // Bonus Rate: ₱0.50 per parcel (if picked up same day)
      const bonusRate = pickedUpSameDay ? incentivizedParcels * 0.5 : 0
      
      return baseRate + bonusRate
    } else if (courier === 'Flash') {
      // Flash: Maximum 30 parcels per Shop ID will be paid ₱3 each
      const maxParcels = Math.min(quantity, 30)
      return maxParcels * 3
    }
    return 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const totalEarning = calculateEarning(formData.courier, formData.quantity, formData.pickedUpSameDay)
    const entryData = { ...formData, totalEarning }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/backend/parcels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(entryData)
      })

      if (response.ok) {
        fetchEntries()
        setFormData({
          taskId: '',
          sellerId: '',
          courier: 'SPX',
          quantity: 0,
          pickedUpSameDay: false,
          date: new Date().toISOString().split('T')[0],
          totalEarning: 0
        })
      }
    } catch (error) {
      console.error('Error submitting entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/backend/export/${format}?filter=${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `parcels-${dateFilter}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const deleteEntry = async (entryId: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/backend/parcels/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchEntries() // Refresh the list
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to delete entry')
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Error deleting entry')
    }
  }

  const sendEmailReport = async () => {
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3003/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          reportType: 'summary',
          dateFilter: dateFilter
        })
      })

      if (response.ok) {
        alert('Report sent successfully!')
        setShowEmailModal(false)
        setEmailData({
          to: '',
          subject: 'Parcel Report - L&A Logistics'
        })
      } else {
        const error = await response.json()
        alert(`Failed to send email: ${error.message}`)
      }
    } catch (error) {
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const updateActivity = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch('http://localhost:3003/api/update-activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  }

  // Update activity when user interacts with the page
  useEffect(() => {
    updateActivity()
    const interval = setInterval(updateActivity, 5 * 60 * 1000) // Every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const totalEarnings = entries.reduce((sum, entry) => sum + entry.totalEarning, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">L&A Logistic Services</h1>
              <p className="text-gray-600">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                My Profile
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">₱</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Earnings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ₱{totalEarnings.toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">#</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Parcels
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {entries.reduce((sum, entry) => sum + entry.quantity, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">📦</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Entries
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {entries.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add New Entry Form */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Add New Parcel Entry
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task ID</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.taskId}
                    onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Seller ID</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Courier</label>
                  <select
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.courier}
                    onChange={(e) => setFormData({ ...formData, courier: e.target.value as 'SPX' | 'Flash' })}
                  >
                    <option value="SPX">SPX</option>
                    <option value="Flash">Flash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                {formData.courier === 'SPX' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pickedUpSameDay"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={formData.pickedUpSameDay}
                      onChange={(e) => setFormData({ ...formData, pickedUpSameDay: e.target.checked })}
                    />
                    <label htmlFor="pickedUpSameDay" className="ml-2 block text-sm text-gray-900">
                      Picked up same day
                    </label>
                  </div>
                )}

                <div className="sm:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Entry'}
                  </button>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <div className="text-sm text-gray-600">
                    Estimated Earning: ₱{calculateEarning(formData.courier, formData.quantity, formData.pickedUpSameDay).toFixed(2)}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Filters and Export */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <label className="block text-sm font-medium text-gray-700">Filter by:</label>
                  <select
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => exportData('pdf')}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => exportData('excel')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Export Excel
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Email Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Parcel Entries
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seller ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Picked Up Same Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Earning
                      </th>
                      {user?.role === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entries.map((entry, index) => (
                      <tr key={entry.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.taskId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.sellerId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.courier === 'SPX' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.courier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.courier === 'SPX' ? (entry.pickedUpSameDay ? 'Yes' : 'No') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₱{entry.totalEarning.toFixed(2)}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteEntry(entry.id!)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {entries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No entries found for the selected period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            Made with ❤️ by aewon.sebastian
          </p>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Email Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send To (Email)
                  </label>
                  <input
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  This will send a detailed report based on the current filter: <strong>{dateFilter}</strong>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmailReport}
                  disabled={sending || !emailData.to}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
