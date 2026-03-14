'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PunchType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'

export default function LoginPage() {
  const [employeeNo, setEmployeeNo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const email = `${employeeNo.toLowerCase()}@gmail.com`

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('従業員番号またはパスワードが正しくありません')
      setLoading(false)
      return
    }

    // ミドルウェアに任せずに直接遷移
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          勤怠管理システム
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          従業員番号とパスワードでログイン
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            従業員番号
          </label>
          <input
            type="text"
            value={employeeNo}
            onChange={(e) => setEmployeeNo(e.target.value)}
            placeholder="例：EMP001"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !employeeNo || !password}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-colors"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

      </div>
    </div>
  )
}