"""
Music21 backend server for Quest of the Harmony Knight.

Provides advanced music theory analysis via a REST API:
- Counterpoint validation (Species 1-5)
- Harmonic analysis (Roman numerals, voice-leading errors)
- Fugue analysis (subject, answer, countersubject identification)

Requires: pip install music21 flask

Run: python music21_server.py
"""

from flask import Flask, request, jsonify
import music21
from music21 import note, stream, interval, key, chord, analysis

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "music21_version": music21.VERSION_STR})


@app.route("/analyze/counterpoint", methods=["POST"])
def analyze_counterpoint():
    """
    Analyze a counterpoint exercise.

    Input JSON:
        cantus_firmus: list of MIDI note numbers
        counterpoint: list of MIDI note numbers
        species: int (1-5)

    Returns:
        score: float (0-1)
        violations: list of string descriptions
        suggestions: list of improvement suggestions
        grade: letter grade (A-F)
    """
    data = request.json
    cf_midi = data.get("cantus_firmus", [])
    cp_midi = data.get("counterpoint", [])
    species = data.get("species", 1)

    if not cf_midi or not cp_midi or len(cf_midi) != len(cp_midi):
        return jsonify({"error": "Cantus firmus and counterpoint must have equal length"}), 400

    violations = []
    suggestions = []

    # Build music21 streams.
    cf_stream = stream.Part()
    cp_stream = stream.Part()
    for midi_val in cf_midi:
        cf_stream.append(note.Note(midi=midi_val, quarterLength=1))
    for midi_val in cp_midi:
        cp_stream.append(note.Note(midi=midi_val, quarterLength=1))

    # Check intervals.
    cf_notes = list(cf_stream.notes)
    cp_notes = list(cp_stream.notes)

    for i in range(len(cf_notes)):
        intv = interval.Interval(cf_notes[i], cp_notes[i])
        semitones = abs(intv.semitones) % 12

        # Dissonance check (for Species 1).
        if species == 1 and semitones in [1, 2, 6, 10, 11]:
            violations.append(
                f"Beat {i + 1}: Dissonant interval ({intv.niceName})"
            )

    # Check for parallel fifths and octaves.
    for i in range(1, len(cf_notes)):
        prev_intv = interval.Interval(cf_notes[i - 1], cp_notes[i - 1])
        curr_intv = interval.Interval(cf_notes[i], cp_notes[i])
        prev_semi = abs(prev_intv.semitones) % 12
        curr_semi = abs(curr_intv.semitones) % 12

        if prev_semi == 7 and curr_semi == 7:
            violations.append(f"Beats {i}-{i + 1}: Parallel fifths")
        if prev_semi == 0 and curr_semi == 0:
            violations.append(f"Beats {i}-{i + 1}: Parallel octaves/unisons")

        # Check for similar motion to perfect consonances.
        cf_dir = cf_notes[i].midi - cf_notes[i - 1].midi
        cp_dir = cp_notes[i].midi - cp_notes[i - 1].midi
        if (cf_dir > 0 and cp_dir > 0) or (cf_dir < 0 and cp_dir < 0):
            if curr_semi in [0, 7]:
                violations.append(
                    f"Beats {i}-{i + 1}: Hidden {('octave' if curr_semi == 0 else 'fifth')}"
                )

    # Voice crossing check.
    for i in range(len(cf_notes)):
        if cp_notes[i].midi < cf_notes[i].midi:
            violations.append(f"Beat {i + 1}: Voice crossing")

    # Calculate score.
    max_possible_violations = len(cf_notes) * 3
    violation_penalty = len(violations) / max(max_possible_violations, 1)
    score = max(0.0, 1.0 - violation_penalty)

    # Grade.
    if score >= 0.9:
        grade = "A"
    elif score >= 0.8:
        grade = "B"
    elif score >= 0.7:
        grade = "C"
    elif score >= 0.6:
        grade = "D"
    else:
        grade = "F"

    # Generate suggestions.
    if violations:
        suggestions.append("Try using more imperfect consonances (3rds and 6ths).")
        suggestions.append("Ensure contrary or oblique motion when approaching perfect intervals.")
    if not violations:
        suggestions.append("Excellent work! Try adding more variety to your melodic contour.")

    return jsonify({
        "score": round(score, 3),
        "violations": violations,
        "suggestions": suggestions,
        "grade": grade,
    })


@app.route("/analyze/harmony", methods=["POST"])
def analyze_harmony():
    """
    Analyze a chord progression.

    Input JSON:
        chords: list of lists of MIDI note numbers
        key: string (e.g., "C major", "A minor")

    Returns:
        roman_numerals: list of Roman numeral labels
        errors: list of voice-leading errors
        key: confirmed key
    """
    data = request.json
    chords_midi = data.get("chords", [])
    key_str = data.get("key", "C major")

    try:
        k = key.Key(key_str)
    except Exception:
        k = key.Key("C")

    roman_numerals = []
    errors = []

    for i, chord_midi in enumerate(chords_midi):
        if not chord_midi:
            continue
        c = chord.Chord([note.Note(midi=m) for m in chord_midi])
        rn = analysis.roman.romanNumeralFromChord(c, k)
        roman_numerals.append(str(rn))

    # Check for parallel motion between adjacent chords.
    for i in range(1, len(chords_midi)):
        if len(chords_midi[i - 1]) < 2 or len(chords_midi[i]) < 2:
            continue
        prev_bass = min(chords_midi[i - 1])
        prev_top = max(chords_midi[i - 1])
        curr_bass = min(chords_midi[i])
        curr_top = max(chords_midi[i])

        outer_prev = abs(prev_top - prev_bass) % 12
        outer_curr = abs(curr_top - curr_bass) % 12

        if outer_prev == 7 and outer_curr == 7:
            errors.append(f"Chords {i}-{i + 1}: Parallel fifths in outer voices")
        if outer_prev == 0 and outer_curr == 0:
            errors.append(f"Chords {i}-{i + 1}: Parallel octaves in outer voices")

    return jsonify({
        "roman_numerals": roman_numerals,
        "errors": errors,
        "key": str(k),
    })


@app.route("/analyze/fugue", methods=["POST"])
def analyze_fugue():
    """
    Analyze a fugue excerpt to identify subject, answer, and countersubject.

    Input JSON:
        voices: list of lists of MIDI note numbers (each voice)

    Returns:
        subject: list of MIDI notes (first entry of first voice)
        answer: list of MIDI notes (first entry of second voice)
        answer_type: "real" or "tonal"
        countersubject: list of MIDI notes (if found)
    """
    data = request.json
    voices = data.get("voices", [])

    if len(voices) < 2:
        return jsonify({"error": "Need at least 2 voices"}), 400

    # Simple heuristic: subject is the first voice's opening,
    # answer is the second voice's opening.
    subject = voices[0][:8] if len(voices[0]) >= 8 else voices[0]
    answer = voices[1][:8] if len(voices[1]) >= 8 else voices[1]

    # Determine if the answer is "real" (exact transposition) or "tonal" (modified).
    if len(subject) == len(answer):
        intervals_subject = [
            subject[i + 1] - subject[i] for i in range(len(subject) - 1)
        ]
        intervals_answer = [
            answer[i + 1] - answer[i] for i in range(len(answer) - 1)
        ]
        answer_type = "real" if intervals_subject == intervals_answer else "tonal"
    else:
        answer_type = "tonal"

    # Countersubject: material in voice 1 while voice 2 states the answer.
    countersubject = None
    if len(voices[0]) > len(subject):
        countersubject = voices[0][len(subject): len(subject) + len(answer)]

    return jsonify({
        "subject": subject,
        "answer": answer,
        "answer_type": answer_type,
        "countersubject": countersubject,
    })


if __name__ == "__main__":
    print("Music21 backend starting on http://localhost:5321")
    app.run(host="localhost", port=5321, debug=True)
