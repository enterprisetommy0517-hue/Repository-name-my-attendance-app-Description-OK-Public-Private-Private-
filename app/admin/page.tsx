'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  employee_no: string
  full_name: string
  department: string | null
  is_active: boolean
  is_admin: boolean
}

type AttendanceLog = {
  id: string
  employee_id: string
  punch_type: string
  punched_at: string
  employees: {
    employee_no: string
    full_name: string
  }
}

const punchLabels: Record<string, { label: string; color: string }> = {
  clock_in:    { label: '出勤',   color: 'bg-green-100 text-green-700' },
  clock_out:   { label: '退勤',   color: 'bg-red-100 text-red-700' },
  break_start: { label: '休憩開始', color: 'bg-yellow-100 text-yellow-700' },
  break_end:   { label: '休憩終了', color: 'bg-blue-100 text-blue-700' },
}

export default function AdminPage() {
  const [tab, setTab] = useState<'logs' | 'employees'>('logs')
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newEmployeeNo, setNewEmployeeNo] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addMessage, setAddMessage] = useState('')

  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: logsData } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        employee_id,
        punch_type,
        punched_at,
        employees (
          employee_no,
          full_name
        )
      `)
      .order('punched_at', { ascending: false })
      .limit(50)

    if (logsData) setLogs(logsData as unknown as AttendanceLog[])

    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .order('employee_no')

    if (employeesData) setEmployees(employeesData)

    setLoading(false)
  }, [])

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!employee?.is_admin) {
        router.push('/dashboard')
        return
      }

      await fetchData()
    }

    checkAdmin()
  }, [router, fetchData])

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('出力するデータがありません')
      return
    }

    const headers = ['従業員番号', '氏名', '打刻種別', '日付', '時刻']

    const rows = logs.map((log) => {
      const date = new Date(log.punched_at)
      const punchLabel = punchLabels[log.punch_type]?.label ?? log.punch_type
      return [
        log.employees?.employee_no ?? '',
        log.employees?.full_name ?? '',
        punchLabel,
        date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        date.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      ]
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const now = new Date()
    const fileName = `打刻データ_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAddEmployee = async () => {
    setAddLoading(true)
    setAddMessage('')
    setError('')

    const supabase = createClient()
    const email = `${newEmployeeNo.toLowerCase()}@gmail.com`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: newPassword,
    })

    if (authError || !authData.user) {
      setError('ユーザーの作成に失敗しました：' + authError?.message)
      setAddLoading(false)
      return
    }

    const { error: empError } = await supabase
      .from('employees')
      .insert({
        id: authData.user.id,
        employee_no: newEmployeeNo,
        full_name: newFullName,
        department: newDepartment || null,
        is_admin: false,
      })

    if (empError) {
      setError('従業員情報の保存に失敗しました：' + empError.message)
      setAddLoading(false)
      return
    }

    setAddMessage(`${newFullName}（${newEmployeeNo}）を追加しました！`)
    setNewEmployeeNo('')
    setNewFullName('')
    setNewDepartment('')
    setNewPassword('')
    await fetchData()
    setAddLoading(false)
  }

  const handleToggleActive = async (employee: Employee) => {
    const supabase = createClient()
    await supabase
      .from('employees')
      .update({ is_active: !employee.is_active })
      .eq('id', employee.id)
    await fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">

        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <h1 className="text-xl font-bold text-gray-800">管理者画面</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            打刻画面へ
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('logs')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              tab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            打刻一覧
          </button>
          <button
            onClick={() => setTab('employees')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              tab === 'employees'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            従業員管理
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
            読み込み中...
          </div>
        ) : (
          <>
            {/* 打刻一覧タブ */}
            {tab === 'logs' && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-bold text-gray-800">最新50件の打刻履歴</h2>
                  <button
                    onClick={handleExportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    CSVダウンロード
                  </button>
                </div>
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    打刻履歴がありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">従業員番号</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">氏名</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">打刻種別</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">日時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log, index) => {
                          const { label, color } = punchLabels[log.punch_type] ?? {
                            label: log.punch_type,
                            color: 'bg-gray-100 text-gray-700',
                          }
                          const date = new Date(log.punched_at)
                          return (
                            <tr
                              key={log.id}
                              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                              <td className="px-4 py-3 text-sm text-gray-800">
                                {log.employees?.employee_no}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800">
                                {log.employees?.full_name}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>
                                  {label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800">
                                {date.toLocaleDateString('ja-JP', {
                                  month: 'long',
                                  day: 'numeric',
                                  weekday: 'short',
                                })}
                                {' '}
                                {date.toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 従業員管理タブ */}
            {tab === 'employees' && (
              <div className="space-y-6">

                {/* 従業員追加フォーム */}
                <div className="bg-white rounded-2xl shadow p-6">
                  <h2 className="font-bold text-gray-800 mb-4">従業員を追加</h2>

                  {addMessage && (
                    <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3 mb-4">
                      {addMessage}
                    </div>
                  )}
                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        従業員番号
                      </label>
                      <input
                        type="text"
                        value={newEmployeeNo}
                        onChange={(e) => setNewEmployeeNo(e.target.value)}
                        placeholder="例：EMP003"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        氏名
                      </label>
                      <input
                        type="text"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="例：田中 花子"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        部署
                      </label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="例：製造部"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        初期パスワード
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8文字以上"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddEmployee}
                    disabled={addLoading || !newEmployeeNo || !newFullName || !newPassword}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors"
                  >
                    {addLoading ? '追加中...' : '従業員を追加'}
                  </button>
                </div>

                {/* 従業員一覧 */}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800">
                      従業員一覧（{employees.length}名）
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">従業員番号</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">氏名</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">部署</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">状態</th>
                          <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp, index) => (
                          <tr
                            key={emp.id}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="px-4 py-3 text-sm text-gray-800">{emp.employee_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">
                              {emp.full_name}
                              {emp.is_admin && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  管理者
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{emp.department ?? '未設定'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                emp.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {emp.is_active ? '在籍中' : '退職'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {!emp.is_admin && (
                                <button
                                  onClick={() => handleToggleActive(emp)}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  {emp.is_active ? '退職にする' : '在籍に戻す'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}