
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import './EvaluationProgress.css';


const serializeHighlights = (container) => {
    if (!container) return null;
    const highlights = [];
    const marks = container.querySelectorAll('.hl-mark');

    marks.forEach(mark => {
        const range = document.createRange();
        range.setStart(container, 0);
        range.setEndBefore(mark);

        const start = range.toString().length;
        const text = mark.innerText;
        const end = start + text.length;
        const comment = mark.getAttribute('data-comment');

        highlights.push({ start, end, comment });
    });
    return JSON.stringify(highlights);
};


const restoreHighlights = (container, jsonString) => {
    if (!container || !jsonString) return;
    try {
        const ranges = JSON.parse(jsonString);
        if (!Array.isArray(ranges)) return;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while(node = walker.nextNode()) textNodes.push(node);

        ranges.forEach(({ start, end, comment }) => {
            let currentPos = 0;
            let startNode = null, startOffset = 0;
            let endNode = null, endOffset = 0;

            for (const textNode of textNodes) {
                const len = textNode.nodeValue.length;
                if (!startNode && start >= currentPos && start < currentPos + len) {
                    startNode = textNode;
                    startOffset = start - currentPos;
                }
                if (!endNode && end > currentPos && end <= currentPos + len) {
                    endNode = textNode;
                    endOffset = end - currentPos;
                }
                currentPos += len;
            }

            if (startNode && endNode) {
                const range = document.createRange();
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);

                const mark = document.createElement('mark');
                mark.className = 'hl-mark';
                if (comment) mark.setAttribute('data-comment', comment);
                try {
                    range.surroundContents(mark);
                } catch (e) {
                    console.warn("Could not restore highlight (likely overlap)", e);
                }
            }
        });
    } catch (e) {
        console.error("Error restoring highlights", e);
    }
};


const collectSelectedTextNodes = (containerEl, master) => {
  const walker = document.createTreeWalker(
    containerEl,
    NodeFilter.SHOW_TEXT,
    { acceptNode(n){ return n.nodeValue && n.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.REJECT; } }
  );
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    if (typeof master.intersectsNode === 'function') {
      if (master.intersectsNode(n)) nodes.push(n);
    } else {
      const r2 = document.createRange(); r2.selectNodeContents(n);
      const intersects = master.compareBoundaryPoints(Range.END_TO_START, r2) < 0 &&
                         master.compareBoundaryPoints(Range.START_TO_END, r2) > 0;
      if (intersects) nodes.push(n);
    }
  }
  return nodes;
};

const wrapRangesWith = (ranges, className, comment) => {
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    const el = document.createElement('mark');
    el.className = className;
    if (comment) el.setAttribute('data-comment', comment);
    r.surroundContents(el);
  }
};

const unwrap = (el) => {
    const p = el.parentNode;
    if (!p) return;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
};

const nearestMark = (node, className, stopAt) => {
  let el = node && node.nodeType === 3 ? node.parentNode : node;
  while (el && el !== stopAt) {
    if (el.nodeType === 1 && el.tagName === 'MARK' && el.classList.contains(className)) return el;
    el = el.parentNode;
  }
  return null;
};


export default function EvaluationProgress() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();


  const [task, setTask] = useState(null);
  const [contentA, setContentA] = useState("Loading content...");
  const [contentB, setContentB] = useState("Loading content...");
  const [contentC, setContentC] = useState("Loading content...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncScroll, setSyncScroll] = useState(false);

  const [criteria, setCriteria] = useState([]);
  const [ratings, setRatings] = useState({ A: {}, B: {}, C: {} });
  const [comments, setComments] = useState({ A: '', B: '', C: '' });
  const [saving, setSaving] = useState('');

  const [tooltip, setTooltip] = useState(null);

  const docARef = useRef(null);
  const docBRef = useRef(null);
  const docCRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  const isScrollingRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const isReadOnly = task?.status === 'COMPLETED' || (user?.role === 'RESEARCHER' || user?.role === 'ADMIN');

  const getArtifactDisplayName = (artifact, side) => {
    return artifact?.fileName || `Artifact ${side}`;
  };


  useEffect(() => {
    const loadTaskData = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: taskData } = await api.get(`/api/tasks/${taskId}`);
        if (!taskData) {
          setError("Task data not found");
          return;
        }
        setTask(taskData);

        const taskCriteria = Array.isArray(taskData.ratingCriteria) ? taskData.ratingCriteria : [];
        setCriteria(taskCriteria);


        const ratingsA = {};
        const ratingsB = {};
        const ratingsC = {};

        const populateRatings = (sourceRatings, targetObj) => {
            if (sourceRatings && Object.keys(sourceRatings).length > 0) {
                Object.entries(sourceRatings).forEach(([criterionId, rating]) => {
                    const id = typeof criterionId === 'string' ? parseInt(criterionId, 10) : criterionId;
                    targetObj[id] = rating != null && !isNaN(rating) ? Math.round(Number(rating)) : 3;
                });
            } else if (taskCriteria.length > 0) {
                taskCriteria.forEach(criterion => {
                    const id = typeof criterion.id === 'string' ? parseInt(criterion.id, 10) : criterion.id;
                    targetObj[id] = 3;
                });
            }
        };

        populateRatings(taskData.criterionRatingsA, ratingsA);
        populateRatings(taskData.criterionRatingsB, ratingsB);
        if (taskData.artifactC) {
            populateRatings(taskData.criterionRatingsC, ratingsC);
        }

        setRatings({ A: ratingsA, B: ratingsB, C: ratingsC });
        setComments({
            A: taskData.commentA || '',
            B: taskData.commentB || '',
            C: taskData.commentC || ''
        });

        const loadArtifact = async (artifactId, setContent, ref, highlightData) => {
            if (!artifactId) return;
            try {
                const res = await api.get(`/api/artifacts/${artifactId}`, { responseType: 'text' });
                setContent(res.data || "Error loading content");
                setTimeout(() => {
                    if (ref.current) {
                        restoreHighlights(ref.current, highlightData);
                    }
                }, 100);
            } catch (e) {
                console.error("Error loading artifact:", e);
                setContent("Error loading content");
            }
        };

        await Promise.all([
            loadArtifact(taskData.artifactA?.id, setContentA, docARef, taskData.highlightDataA),
            loadArtifact(taskData.artifactB?.id, setContentB, docBRef, taskData.highlightDataB),
            taskData.artifactC?.id ? loadArtifact(taskData.artifactC?.id, setContentC, docCRef, taskData.highlightDataC) : Promise.resolve()
        ]);

      } catch (err) {
        console.error("Failed to load task", err);
        setError(err.response?.data?.message || err.message || "Could not load evaluation task.");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      loadTaskData();
    } else {
      setError("Task ID is required");
      setLoading(false);
    }
  }, [taskId]);


  const preparePayload = () => {
    const hlDataA = serializeHighlights(docARef.current);
    const hlDataB = serializeHighlights(docBRef.current);
    const hlDataC = serializeHighlights(docCRef.current);

    const criterionRatingsA = {};
    const criterionRatingsB = {};
    const criterionRatingsC = {};

    if (criteria && Array.isArray(criteria)) {
        criteria.forEach(criterion => {
            const criterionId = typeof criterion.id === 'string' ? parseInt(criterion.id, 10) : criterion.id;
            if (ratings.A && ratings.A[criterionId] != null) criterionRatingsA[criterionId] = Math.round(Number(ratings.A[criterionId]));
            if (ratings.B && ratings.B[criterionId] != null) criterionRatingsB[criterionId] = Math.round(Number(ratings.B[criterionId]));
            if (ratings.C && ratings.C[criterionId] != null) criterionRatingsC[criterionId] = Math.round(Number(ratings.C[criterionId]));
        });
    }

    return {
        annotations: (comments.A || comments.B || comments.C) ? "Draft saved via UI" : null,
        commentA: comments.A || null,
        highlightDataA: hlDataA,
        commentB: comments.B || null,
        highlightDataB: hlDataB,
        commentC: comments.C || null,
        highlightDataC: hlDataC,
        criterionRatingsA: criterionRatingsA,
        criterionRatingsB: criterionRatingsB,
        criterionRatingsC: criterionRatingsC
    };
  };

  const saveDraft = async (silent = false) => {
    if (isReadOnly || loading) return;
    if (!silent) setSaving('Saving...');

    try {
        const payload = preparePayload();
        await api.post(`/api/tasks/${taskId}/save-draft`, payload);

        if (!silent) {
            setSaving('All changes saved');
            setTimeout(() => setSaving(''), 2000);
        }
    } catch (err) {
        console.error("Draft save failed", err);
        if (!silent) setSaving('Error saving draft');
    }
  };

  useEffect(() => {
    if (loading || isReadOnly) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    setSaving('Saving...');
    autoSaveTimeoutRef.current = setTimeout(() => {
        saveDraft(false);
    }, 1500);

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [ratings, comments]);


  const handleScroll = (e, key) => {
    if (!syncScroll) return;


    if (isScrollingRef.current && isScrollingRef.current !== key) return;

    isScrollingRef.current = key;

    const el = e.target;

    const percentage = el.scrollTop / (el.scrollHeight - el.clientHeight);


    ['A', 'B', 'C'].forEach(otherKey => {
        if (otherKey === key) return;

        let otherRef = null;
        if (otherKey === 'A') otherRef = docARef;
        else if (otherKey === 'B') otherRef = docBRef;
        else if (otherKey === 'C') otherRef = docCRef;

        if (otherRef && otherRef.current) {
            otherRef.current.scrollTop = percentage * (otherRef.current.scrollHeight - otherRef.current.clientHeight);
        }
    });


    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = null;
    }, 50);
  };

  const handleExit = async (e) => {
    e.preventDefault();
    if (user?.role === 'RESEARCHER' || user?.role === 'ADMIN') {
        navigate(-1);
        return;
    }
    if (isReadOnly) {
        navigate('/participant-dashboard');
        return;
    }

    setSubmitting(true);
    setSaving('Saving before exit...');
    await saveDraft(true);
    navigate('/participant-dashboard');
  };

  const updateRating = (k, criterionId, value) => {
    if (isReadOnly) return;
    const intValue = Math.round(Number(value));
    const clampedValue = Math.max(1, Math.min(5, intValue));
    setRatings(prev => ({
      ...prev,
      [k]: { ...prev[k], [criterionId]: clampedValue }
    }));
  };

  const handleSubmit = async () => {
    if (!criteria || criteria.length === 0) {
      alert("Cannot submit: No rating criteria are defined for this study.");
      return;
    }

    const missingRatings = [];
    const artifactsToCheck = ['A', 'B'];
    if (task?.artifactC) artifactsToCheck.push('C');

    criteria.forEach(criterion => {
      const criterionId = typeof criterion.id === 'string' ? parseInt(criterion.id, 10) : criterion.id;
      artifactsToCheck.forEach(key => {
          if (!ratings[key] || ratings[key][criterionId] == null) {
              missingRatings.push(`Artifact ${key}: ${criterion.name}`);
          }
      });
    });

    if (missingRatings.length > 0) {
      alert(`Please provide ratings for all criteria:\n${missingRatings.join('\n')}`);
      return;
    }

    if (!window.confirm("Are you sure you want to submit your evaluation?")) return;

    setSubmitting(true);
    try {
        const payload = preparePayload();
        payload.annotations = "Evaluation completed via UI";

        await api.post(`/api/tasks/${taskId}/complete`, payload);
        alert('Evaluation submitted successfully!');
        navigate('/participant-dashboard');

    } catch (err) {
        console.error("Submission failed", err);
        alert("Failed to submit evaluation. Please try again.");
        setSubmitting(false);
    }
  };


  const highlightSelectionIn = (containerEl) => {
    if (isReadOnly) return;
    if (!containerEl) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return alert('Select text to highlight.');

    const master = sel.getRangeAt(0);
    if (!containerEl.contains(master.commonAncestorContainer)) return alert('Please select text within this artifact.');

    const selectedTextNodes = collectSelectedTextNodes(containerEl, master);
    if (!selectedTextNodes.length) return alert('Please select text within this artifact.');

    const markSet = new Set();
    const allInside = selectedTextNodes.every(n => {
      const m = nearestMark(n, 'hl-mark', containerEl);
      if (m) markSet.add(m);
      return !!m;
    });

    if (allInside) {
      markSet.forEach(unwrap);
      sel.removeAllRanges();
      saveDraft(false);
      return;
    }

    const comment = window.prompt("Enter an inline comment for this highlight (optional):");
    if (comment === null) return;

    const subRanges = [];
    selectedTextNodes.forEach(n => {
      const start = (n === master.startContainer) ? master.startOffset : 0;
      const end   = (n === master.endContainer)   ? master.endOffset   : n.nodeValue.length;
      if (end > start) { const r = document.createRange(); r.setStart(n, start); r.setEnd(n, end); subRanges.push(r); }
    });

    wrapRangesWith(subRanges, 'hl-mark', comment);
    sel.removeAllRanges();
    saveDraft(false);
  };

  const handleMouseOver = (e) => {
      const target = e.target;
      if (target.classList.contains('hl-mark') && target.getAttribute('data-comment')) {
          const rect = target.getBoundingClientRect();
          setTooltip({
              x: rect.left + (rect.width / 2),
              y: rect.top,
              content: target.getAttribute('data-comment')
          });
      }
  };

  const handleMouseOut = (e) => {
      if (e.target.classList.contains('hl-mark')) {
          setTooltip(null);
      }
  };

  if (loading) return <div className="eval-root"><div className="eval-title">Loading Task...</div></div>;
  if (error) return <div className="eval-root"><div className="eval-title error">{error}</div></div>;

  const hasC = !!task?.artifactC;
  const artifactKeys = hasC ? ['A', 'B', 'C'] : ['A', 'B'];

  return (
    <div className="eval-root">
      {tooltip && (
          <div className="hl-tooltip" style={{ top: tooltip.y, left: tooltip.x }}>
              {tooltip.content}
          </div>
      )}
      <header className="eval-topbar">
        <div className="eval-title">
            {user?.role === 'RESEARCHER' || user?.role === 'ADMIN'
                ? `Reviewing Evaluation: ${task?.studyTitle}`
                : `Evaluation Progress: ${task?.studyTitle}`
            }
            <span className="muted"> (Task ID: {taskId})</span>

            {task?.studyDescription && (
                <div className="muted" style={{marginTop: '8px', fontSize: '0.95em', lineHeight: '1.4'}}>
                   {task.studyDescription}
                </div>
            )}

            {task?.description && (
                <span className="muted" style={{display: 'block', marginTop: '4px', fontSize: '0.9em', fontStyle: 'italic', color: '#aaa'}}>
                    Task Note: {task.description}
                </span>
            )}
            {isReadOnly && <span style={{color: '#4CAF50', marginLeft: '10px'}}> [READ ONLY]</span>}
        </div>
        <nav className="eval-actions">
          <div className="action-group">
            <button
                className={`toggle-btn ${syncScroll ? '' : 'outline'}`}
                onClick={() => setSyncScroll(!syncScroll)}
                title="Synchronize scrolling across all artifacts"
            >
                {syncScroll ? 'Sync Scroll On' : 'Sync Scroll Off'}
            </button>
            <button
                onClick={handleExit}
                className="ghost-btn"
                style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    cursor: 'pointer'
                }}
                disabled={submitting}
            >
                {isReadOnly ? 'Exit' : 'Save & Exit'}
            </button>
          </div>
        </nav>
      </header>

      <section className={`eval-grid ${hasC ? 'triple' : ''}`}>

        <article className="artifact-card">
          <div className="artifact-header">
            <div className="artifact-title">Artifact A: {getArtifactDisplayName(task?.artifactA, 'A')}</div>
            <div className="author">
                <span className="avatar">
                    {task?.artifactA?.uploaderName?.charAt(0).toUpperCase() || '?'}
                </span>
                <span className="author-name">
                    {task?.artifactA?.uploaderName || 'Unknown'}
                </span>
            </div>
          </div>
          <div
            className="doc-view"
            tabIndex={0}
            ref={docARef}
            style={{whiteSpace: 'pre-wrap'}}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onScroll={(e) => handleScroll(e, 'A')}
          >
            {contentA}
          </div>
          <div className="action-row">
            <button
                className="pill-btn"
                onClick={() => highlightSelectionIn(docARef.current)}
                disabled={isReadOnly}
                style={isReadOnly ? {opacity:0.5, cursor:'not-allowed'} : {}}
            >
                Highlight
            </button>
          </div>
        </article>


        <article className="artifact-card outlined">
          <div className="artifact-header">
            <div className="artifact-title">Artifact B: {getArtifactDisplayName(task?.artifactB, 'B')}</div>
            <div className="author">
                <span className="avatar alt">
                    {task?.artifactB?.uploaderName?.charAt(0).toUpperCase() || '?'}
                </span>
                <span className="author-name">
                    {task?.artifactB?.uploaderName || 'Unknown'}
                </span>
            </div>
          </div>
          <div
            className="doc-view"
            tabIndex={0}
            ref={docBRef}
            style={{whiteSpace: 'pre-wrap'}}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onScroll={(e) => handleScroll(e, 'B')}
          >
            {contentB}
          </div>
          <div className="action-row">
            <button
                className="pill-btn"
                onClick={() => highlightSelectionIn(docBRef.current)}
                disabled={isReadOnly}
                style={isReadOnly ? {opacity:0.5, cursor:'not-allowed'} : {}}
            >
                Highlight
            </button>
          </div>
        </article>


        {hasC && (
            <article className="artifact-card">
              <div className="artifact-header">
                <div className="artifact-title">Artifact C: {getArtifactDisplayName(task?.artifactC, 'C')}</div>
                <div className="author">
                    <span className="avatar">
                        {task?.artifactC?.uploaderName?.charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="author-name">
                        {task?.artifactC?.uploaderName || 'Unknown'}
                    </span>
                </div>
              </div>
              <div
                className="doc-view"
                tabIndex={0}
                ref={docCRef}
                style={{whiteSpace: 'pre-wrap'}}
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
                onScroll={(e) => handleScroll(e, 'C')}
              >
                {contentC}
              </div>
              <div className="action-row">
                <button
                    className="pill-btn"
                    onClick={() => highlightSelectionIn(docCRef.current)}
                    disabled={isReadOnly}
                    style={isReadOnly ? {opacity:0.5, cursor:'not-allowed'} : {}}
                >
                    Highlight
                </button>
              </div>
            </article>
        )}
      </section>


      <section className="rating-card">
        <h3 className="rating-title">Rating Panel</h3>
        {artifactKeys.map(k => (
          <div key={k} className="artifact-rating-block">
            <h4 style={{ margin: '8px 0 6px' }}>
                Artifact {k} ({getArtifactDisplayName(task?.[`artifact${k}`], k)})
            </h4>

            {criteria && criteria.length > 0 ? (
                criteria.map(criterion => {
                    const criterionId = typeof criterion.id === 'string' ? parseInt(criterion.id, 10) : criterion.id;
                    const ratingValue = (ratings[k] && ratings[k][criterionId] != null) ? Math.round(Number(ratings[k][criterionId])) : 3;
                    return (
                        <div className="slider-row" key={criterionId || criterion.id} style={{marginBottom: '1rem'}}>
                            <div style={{marginBottom: '0.25rem'}}>
                                <label style={{fontWeight: '600', fontSize: '0.95rem', display: 'block'}}>
                                    {criterion.name || 'Criterion'}
                                </label>
                                {criterion.description && (
                                    <div style={{fontSize: '0.85rem', color: '#aaa', marginTop: '0.25rem', fontStyle: 'italic', lineHeight: '1.4'}}>
                                            {criterion.description}
                                    </div>
                                )}
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <input
                                    type="range" min="1" max="5" step="1"
                                    value={ratingValue}
                                    disabled={isReadOnly}
                                    onChange={(e)=>updateRating(k, criterionId, Math.round(Number(e.target.value)))}
                                    style={{flex: 1}}
                                />
                                <span className="slider-val" style={{minWidth: '3rem', textAlign: 'right'}}>{ratingValue}</span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div style={{padding: '1rem', backgroundColor: '#3a2a2a', border: '1px solid #5a3a3a', borderRadius: '4px', color: '#ffaaaa'}}>
                    <strong>No rating criteria defined for this study.</strong>
                    <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}>
                        Please contact the researcher to set up rating criteria before evaluating artifacts.
                    </p>
                </div>
            )}

            <label className="comment-label">Comment for Artifact {k}</label>
            <textarea
              className="artifact-comment-input"
              rows={3}
              placeholder={isReadOnly ? "No comments provided." : `Write your overall comment for Artifact ${k}…`}
              value={comments[k]}
              disabled={isReadOnly}
              onChange={(e)=>setComments(prev => ({ ...prev, [k]: e.target.value }))}
            />

            <hr className="rating-divider" />
          </div>
        ))}

        <div className="save-hint" style={{
             color: saving.includes('Error') ? '#ff6b6b' : '#888',
             fontStyle: 'italic',
             minHeight: '20px'
         }}>
             {!isReadOnly && saving}
         </div>
        <div className="submit-row">
          {isReadOnly ? (
             <button className="submit-btn" style={{backgroundColor: '#555'}} onClick={handleExit}>Return to Dashboard</button>
          ) : (
             <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
             </button>
          )}
        </div>
      </section>
    </div>
  );
}
