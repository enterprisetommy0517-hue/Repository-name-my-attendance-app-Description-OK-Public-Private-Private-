'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PunchType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end'

type LastPunch = {
  punch_type: PunchType
  punched_at: string
}

const punchLabels: Record<PunchType, string> = {
  clock_in: '出勤',
  clock_out: '退勤',
  break_start: '休憩開始',
  break_end: '休憩終了',
}

const punchColors: Record<PunchType, string> = {
  clock_in: 'bg-green-500 hover:bg-green-600',
  clock_out: 'bg-red-500 hover:bg-red-600',
  break_start: 'bg-yellow-500 hover:bg-yellow-600',
  break_end: 'bg-blue-500 hover:bg-blue-600',
}

const lastPunchColors: Record<PunchType, string> = {
  clock_in: 'bg-green-50 text-green-700 border-green-200',
  clock_out: 'bg-red-50 text-red-700 border-red-200',
  break_start: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  break_end: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function DashboardPage() {
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState<PunchType | null>(null)
  const [message, setMessage] = useState('')
  const [lastPunch, setLastPunch] = useState<LastPunch | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const router = useRouter()

  // 1秒ごとに時刻を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 最後の打刻を取得
  const fetchLastPunch = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // 従業員名を取得
    const { data: employee } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (employee) setEmployeeName(employee.full_name)

    // 最後の打刻を取得
    const { data: lastLog } = await supabase
      .from('attendance_logs')
      .select('punch_type, punched_at')
      .eq('employee_id', user.id)
      .order('punched_at', { ascending: false })
      .limit(1)
      .single()

    if (lastLog) setLastPunch(lastLog as LastPunch)

    setInitialLoading(false)
  }, [router])

  useEffect(() => {
    fetchLastPunch()
  }, [fetchLastPunch])

  const handlePunch = async (punchType: PunchType) => {
    setLoading(punchType)
    setMessage('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: user.id,
        punch_type: punchType,
      })

    if (error) {
      setMessage('エラーが発生しました。もう一度お試しください。')
    } else {
      setMessage(`${punchLabels[punchType]}を記録しました！`)
      // 最後の打刻を更新
      setLastPunch({
        punch_type: punchType,
        punched_at: new Date().toISOString(),
      })
    }

    setLoading(null)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const buttons: { type: PunchType }[] = [
    { type: 'clock_in' },
    { type: 'clock_out' },
    { type: 'break_start' },
    { type: 'break_end' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">

        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">勤怠管理</h1>
            {employeeName && (
              <p className="text-sm text-gray-500">{employeeName}</p>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => router.push('/dashboard/history')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              履歴
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 現在時刻（リアルタイム更新） */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4 text-center">
          <p className="text-gray-500 text-sm mb-1">現在時刻</p>
          <p className="text-5xl font-bold text-gray-800 tabular-nums">
            {now.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {now.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>

        {/* 直前の打刻状態 */}
        {!initialLoading && (
          <div className={`rounded-xl border p-4 mb-4 ${
            lastPunch
              ? lastPunchColors[lastPunch.punch_type]
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <p className="text-xs font-medium mb-1">直前の打刻</p>
            {lastPunch ? (
              <div className="flex justify-between items-center">
                <p className="font-bold text-lg">
                  {punchLabels[lastPunch.punch_type]}
                </p>
                <p className="text-sm">
                  {new Date(lastPunch.punched_at).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' '}
                  {new Date(lastPunch.punched_at).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ) : (
              <p className="font-medium">本日まだ打刻がありません</p>
            )}
          </div>
        )}

        {/* メッセージ */}
        {message && (
          <div className={`rounded-lg p-4 mb-4 text-center font-medium ${
            message.includes('エラー')
              ? 'bg-red-50 text-red-600'
              : 'bg-green-50 text-green-600'
          }`}>
            {message}
          </div>
        )}

        {/* 打刻ボタン */}
        <div className="grid grid-cols-2 gap-4">
          {buttons.map(({ type }) => (
            <button
              key={type}
              onClick={() => handlePunch(type)}
              disabled={loading !== null}
              className={`${punchColors[type]} disabled:opacity-50 text-white font-bold py-10 rounded-2xl shadow text-xl transition-colors`}
            >
              {loading === type ? '記録中...' : punchLabels[type]}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}