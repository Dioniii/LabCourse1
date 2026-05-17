import React, { useEffect, useMemo, useState } from 'react';
import axios, { AxiosError } from 'axios';

// Types


export type Fabrika = {
    FabrikaID : number;
    Emri : string;
    Lokacioni : string;
    Shteti : string;
}



export type Roboti = {
    RobotiID :number;
    Emri: string;
    Modeli: string;
    VitiProdhimit: number;
    FabrikaID?: number | null;
}

// Constants
const API = 'http://localhost:8000';

// Utility functions
const authHeaders = () => {
  const token = localStorage.getItem('jwtToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toErrorMessage = (err: unknown): string => {
  const ax = err as AxiosError<{ message?: string }>;
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.message) return ax.message;
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
};

const nextRobotiIDFrom = <T,>(items: T[], idSelector: (t: T) => number | undefined | null): number => {
  const ids = items.map(idSelector).filter((n): n is number => typeof n === 'number');
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
};

// Styles
const styles = {
  container: { padding: 16, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  error: { color: '#b00020', background: '#fde7e9', padding: 8, borderRadius: 6, marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  section: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fafafa' },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: 12 },
  th: { background: '#f1f5f9', padding: '8px 12px', textAlign: 'left' as const, border: '1px solid #e5e7eb', fontSize: '14px' },
  td: { padding: '8px 12px', border: '1px solid #e5e7eb', fontSize: '14px' },
  input: { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '14px' },
  select: { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '14px' },
  button: { padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '14px', marginRight: 4 },
  buttonPrimary: { background: '#3b82f6', color: 'white' },
  buttonSuccess: { background: '#10b981', color: 'white' },
  buttonDanger: { background: '#ef4444', color: 'white' },
  buttonWarning: { background: '#f59e0b', color: 'white' },
  formGroup: { marginBottom: 12 },
  label: { display: 'block', marginBottom: 4, fontWeight: '500', fontSize: '14px' },
  buttonGroup: { display: 'flex', gap: 8, marginTop: 12 },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }
};

const RobotiManagement: React.FC = () => {
  // State
  const [fabrikas, setFabrikas] = useState<Fabrika[]>([]);
  const [robotis, setRobotis] = useState<Roboti[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterFabrikaRobotiID, setFilterFabrikaRobotiID] = useState<number | 'all'>('all');

  // Forms
  const [fabrikasForm, setFabrikaForm] = useState<Fabrika>({ FabrikaID: 0, Emri: '', Lokacioni: '', Shteti: ''});
  const [editFabrikaRobotiID, setEditFabrikaRobotiID] = useState<number | null>(null);
  const [robotiiForm, setRobotiForm] = useState<Roboti>({ RobotiID: 0, Emri: '', Modeli: '', VitiProdhimit: 0 ,FabrikaID: undefined });
  const [editRobotiRobotiID, setEditRobotiRobotiID] = useState<number | null>(null);

  // Computed values
  const filteredRobotis = useMemo(() => 
    filterFabrikaRobotiID === 'all' ? robotis : robotis.filter(l => l.FabrikaID === filterFabrikaRobotiID), 
    [robotis, filterFabrikaRobotiID]
  );

  // Effects
  useEffect(() => { refreshAll(); }, []);
  useEffect(() => {
    if (!editFabrikaRobotiID) setFabrikaForm(prev => ({ ...prev, FabrikaID: nextRobotiIDFrom(fabrikas, l => l.FabrikaID) }));
  }, [fabrikas, editFabrikaRobotiID]);
  useEffect(() => {
    if (!editRobotiRobotiID) setRobotiForm(prev => ({ ...prev, RobotiID: nextRobotiIDFrom(robotis, l => l.RobotiID) }));
  }, [robotis, editRobotiRobotiID]);

  // API functions
  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lecRes, lRes] = await Promise.all([
        axios.get<Fabrika[]>(`${API}/api/fabrikas`, { headers: authHeaders() }),
        axios.get<Roboti[]>(`${API}/api/robotis`, { headers: authHeaders() })
      ]);
      setFabrikas(lecRes.data);
      setRobotis(lRes.data);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Fabrika handlers
  const saveFabrika = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editFabrikaRobotiID) {
        await axios.put(`${API}/api/fabrikas/${editFabrikaRobotiID}`, {
          Emri: fabrikasForm.Emri,
          Lokacioni: fabrikasForm.Lokacioni,
          Shteti: fabrikasForm.Shteti
        }, { headers: authHeaders() });
      } else {
        const idExists = fabrikas.some(l => l.FabrikaID === fabrikasForm.FabrikaID);
        if (idExists) throw new Error('FabrikaID ekziston. Ndryshoni ID-në.');
        await axios.post(`${API}/api/fabrikas`, fabrikasForm, { headers: authHeaders() });
      }
      resetFabrikaForm();
      await refreshAll();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const resetFabrikaForm = () => {
    setFabrikaForm({ FabrikaID: nextRobotiIDFrom(fabrikas, l => l.FabrikaID), Emri: '', Lokacioni: '', Shteti: '' });
    setEditFabrikaRobotiID(null);
  };

  const deleteFabrika = async (id: number) => {
    if (!window.confirm('A jeni i sigurt që dëshironi ta fshini Fabrikan?')) return;
    try {
      await axios.delete(`${API}/api/fabrikas/${id}`, { headers: authHeaders() });
      await refreshAll();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  // Roboti handlers
  const saveRoboti = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editRobotiRobotiID) {
        await axios.put(`${API}/api/robotis/${editRobotiRobotiID}`, {
          Emri: robotiiForm.Emri,
          Modeli: robotiiForm.Modeli,
          VitiProdhimit: robotiiForm.VitiProdhimit,
          FabrikaID: robotiiForm.FabrikaID ?? null
        }, { headers: authHeaders() });
      } else {
        const idExists = robotis.some(l => l.RobotiID === robotiiForm.RobotiID);
        if (idExists) throw new Error('RobotiID ekziston. Ndryshoni ID-në.');
        await axios.post(`${API}/api/robotis`, robotiiForm, { headers: authHeaders() });
      }
      setRobotiForm({ RobotiID: nextRobotiIDFrom(robotis, l => l.RobotiID), Emri: '', Modeli: '',VitiProdhimit: 0, FabrikaID: undefined });
      setEditRobotiRobotiID(null);
      await refreshAll();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const deleteRoboti = async (id: number) => {
    if (!window.confirm('A jeni i sigurt që dëshironi ta fshini Robotin?')) return;
    try {
      await axios.delete(`${API}/api/robotis/${id}`, { headers: authHeaders() });
      await refreshAll();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ marginBottom: 12 }}>Menaxhimi i Fabrikave dhe Robotieve</h2>
      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={{ marginBottom: 12 }}>Duke u ngarkuar…</div>}

      <div style={styles.grid}>
        {/* Fabrikas Section */}
        <section style={styles.section}>
          <h3 style={{ marginTop: 0 }}>{editFabrikaRobotiID ? 'Përditëso Fabrikan' : 'Shto Fabrika'}</h3>
          <form onSubmit={saveFabrika}>
            {!editFabrikaRobotiID && (
              <div style={styles.formGroup}>
                <label style={styles.label}>ID</label>
                <input type="number" value={fabrikasForm.FabrikaID} onChange={e => setFabrikaForm(prev => ({ ...prev, FabrikaID: Number(e.target.value) }))} required style={styles.input} />
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Emri</label>
              <input value={fabrikasForm.Emri} onChange={e => setFabrikaForm(prev => ({ ...prev, Emri: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Lokacioni</label>
              <input value={fabrikasForm.Lokacioni} onChange={e => setFabrikaForm(prev => ({ ...prev, Lokacioni: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shteti</label>
              <input value={fabrikasForm.Shteti} onChange={e => setFabrikaForm(prev => ({ ...prev, Shteti: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.buttonGroup}>
              <button type="submit" style={{...styles.button, ...styles.buttonSuccess}}>{editFabrikaRobotiID ? 'Ruaj Ndryshimet' : 'Shto'}</button>
              {editFabrikaRobotiID && <button type="button" onClick={resetFabrikaForm} style={{...styles.button, ...styles.buttonWarning}}>Anulo</button>}
            </div>
          </form>

          <hr style={{ margin: '16px 0' }} />
          <h4 style={{ marginTop: 0 }}>Lista e Fabrikave</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Emri</th>
                <th style={styles.th}>Lokacioni</th>
                <th style={styles.th}>Shteti</th>
                <th style={styles.th}>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {fabrikas.map(l => (
                <tr key={l.FabrikaID}>
                  <td style={styles.td}>{l.FabrikaID}</td>
                  <td style={styles.td}>{l.Emri}</td>
                  <td style={styles.td}>{l.Lokacioni}</td>
                  <td style={styles.td}>{l.Shteti}</td>
                  <td style={styles.td}>
                    <button onClick={() => { setEditFabrikaRobotiID(l.FabrikaID); setFabrikaForm(l); }} style={{...styles.button, ...styles.buttonPrimary}}>Edito</button>
                    <button onClick={() => deleteFabrika(l.FabrikaID)} style={{...styles.button, ...styles.buttonDanger}}>Fshij</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Robotis Section */}
        <section style={styles.section}>
          <h3 style={{ marginTop: 0 }}>{editRobotiRobotiID ? 'Përditëso Robotin' : 'Shto Roboti'}</h3>
          <form onSubmit={saveRoboti}>
            {!editRobotiRobotiID && (
              <div style={styles.formGroup}>
                <label style={styles.label}>ID</label>
                <input type="number" value={robotiiForm.RobotiID} onChange={e => setRobotiForm(prev => ({ ...prev, RobotiID: Number(e.target.value) }))} required style={styles.input} />
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Titulli i Robotit</label>
              <input value={robotiiForm.Emri} onChange={e => setRobotiForm(prev => ({ ...prev, Emri: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Modeli</label>
              <input value={robotiiForm.Modeli} onChange={e => setRobotiForm(prev => ({ ...prev, Modeli: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>VitiProdhimit</label>
              <input type="number" value={robotiiForm.VitiProdhimit} onChange={e => setRobotiForm(prev => ({ ...prev, VitiProdhimit: Number(e.target.value) }))} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Fabrika</label>
              <select value={robotiiForm.FabrikaID ?? ''} onChange={e => setRobotiForm(prev => ({ ...prev, FabrikaID: e.target.value ? Number(e.target.value) : undefined }))} style={styles.select}>
                <option value="">— Zgjidh Fabrikan —</option>
                {fabrikas.map(l => <option key={l.FabrikaID} value={l.FabrikaID}>{l.Emri}</option>)}
              </select>
            </div>
            <div style={styles.buttonGroup}>
              <button type="submit" style={{...styles.button, ...styles.buttonSuccess}}>{editRobotiRobotiID ? 'Ruaj Ndryshimet' : 'Shto'}</button>
              {editRobotiRobotiID && <button type="button" onClick={() => { setEditRobotiRobotiID(null); setRobotiForm({ RobotiID: nextRobotiIDFrom(robotis, l => l.RobotiID), Emri: '', Modeli: '',VitiProdhimit:  0, FabrikaID: undefined }); }} style={{...styles.button, ...styles.buttonWarning}}>Anulo</button>}
            </div>
          </form>

          

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Emri</th>
                <th style={styles.th}>Modeli</th>
                <th style={styles.th}>V.Prodhimit</th>
                <th style={styles.th}>Fabrika</th>
                <th style={styles.th}>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filteredRobotis.map(l => (
                <tr key={l.RobotiID}>
                  <td style={styles.td}>{l.RobotiID}</td>
                  <td style={styles.td}>{l.Emri}</td>
                  <td style={styles.td}>{l.Modeli}</td>
                  <td style={styles.td}>{l.VitiProdhimit}</td>
                  <td style={styles.td}>{l.FabrikaID || 'Pa Fabrika'}</td>
                  <td style={styles.td}>
                    <button onClick={() => { setEditRobotiRobotiID(l.RobotiID); setRobotiForm({ RobotiID: l.RobotiID, Emri: l.Emri, Modeli: l.Modeli, VitiProdhimit: l.VitiProdhimit, FabrikaID: l.FabrikaID }); }} style={{...styles.button, ...styles.buttonPrimary}}>Edito</button>
                    <button onClick={() => deleteRoboti(l.RobotiID)} style={{...styles.button, ...styles.buttonDanger}}>Fshij</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default RobotiManagement;