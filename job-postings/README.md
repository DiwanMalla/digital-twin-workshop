# Interview Simulation with Real Job Postings

## Overview
This folder contains real job postings from Seek.com.au for practicing interview simulations with your digital twin MCP server.

## Quick Start Guide

### Step 1: Find Your Target Job
1. Visit https://www.seek.com.au/
2. Search for roles matching your skills (70-80% overlap)
3. Choose postings with detailed requirements and selection criteria
4. Copy the entire job posting content

### Step 2: Add Job Posting
1. Open `job1.md` (or create `job2.md`, `job3.md`, etc.)
2. Paste the complete job posting content
3. Save the file

### Step 3: Run Interview Simulation
Use this prompt in GitHub Copilot Chat:

```
@workspace You are a senior recruiter conducting a comprehensive interview simulation using the job posting in job-postings/job1.md and my digital twin MCP server data.

**INTERVIEW PROCESS:**

**Phase 1 - Initial Screening (5 minutes)**
You are HIGHLY CRITICAL and expect SHORT, SHARP answers. Check these critical factors:
- Location compatibility and willingness to work from specified location
- Salary expectations alignment with the offered range
- ALL mandatory/key selection criteria are met
- Technical skills match the specific requirements
- Experience level appropriate for the role

Ask 3-4 probing screening questions.

**Phase 2 - Technical Assessment (10 minutes)**
Conduct focused technical evaluation:
- Specific programming languages/frameworks mentioned in the job
- Years of experience with required technologies
- Project complexity and scale they've handled
- Problem-solving approach for job scenarios
- Technical leadership experience if required

Provide a technical competency matrix with 1-5 ratings for each required skill.

**Phase 3 - Cultural Fit (5 minutes)**
Analyze behavioral fit:
- Working style compatibility
- Leadership experience vs expectations
- Team collaboration skills
- Communication style
- Career motivation alignment

**Phase 4 - Final Assessment Report**
Provide comprehensive report:

**EXECUTIVE SUMMARY:**
- HIRE/DO NOT HIRE recommendation
- Overall suitability score (1-10)
- Key reasons for recommendation

**DETAILED BREAKDOWN:**
- Technical competency scores
- Experience relevance analysis
- Cultural fit evaluation
- Salary/location alignment
- Risk factors identified

**IMPROVEMENT AREAS:**
- Skills gaps to address
- Missing profile information
- Areas for better interview responses
- Recommended next steps

Be ruthless in your assessment - only recommend candidates who are genuinely suitable for this specific role.
```

## Different Interviewer Personas

Test with various interview stages (create NEW chat sessions for each):

### 1. HR/Recruiter Screen (15 min)
Focus: Cultural fit, basic qualifications, salary expectations

### 2. Technical Interview (45 min)
Focus: Technical competency, problem-solving, architecture

### 3. Hiring Manager (30 min)
Focus: Role fit, team dynamics, project experience

### 4. Project Manager (25 min)
Focus: Collaboration, communication, delivery

### 5. Head of People & Culture (20 min)
Focus: Values alignment, team culture, long-term fit

### 6. Executive/Leadership (25 min)
Focus: Strategic thinking, leadership potential, business impact

## Improving Your Profile

After each simulation:

1. **Review feedback** - Note skills gaps and missing information
2. **Update digitaltwin.json** - Add missing details, enhance STAR stories
3. **Re-embed data** - Run `python embed_digitaltwin.py`
4. **Re-test** - Run simulation again to verify improvements

### Key Areas to Enhance:

**Salary & Location:**
```json
{
  "salary_location": {
    "current_salary_range": "$85,000 - $95,000 AUD",
    "salary_expectations": "$95,000 - $110,000 AUD",
    "location_preferences": ["Melbourne", "Sydney", "Remote"],
    "relocation_willing": true,
    "remote_experience": "3 years full remote work",
    "travel_availability": "Up to 25% interstate"
  }
}
```

**STAR Format Projects:**
```json
{
  "projects_star_format": [
    {
      "project_name": "Project Name",
      "situation": "Business challenge context",
      "task": "Your specific role and responsibilities",
      "action": "Detailed steps and technologies used",
      "result": "Quantified outcomes and impact",
      "technologies": ["Tech1", "Tech2"],
      "team_size": 4,
      "duration": "6 months"
    }
  ]
}
```

## Success Metrics

Target scores for each interview type:
- ✅ Technical Interview: 7+ on core skills
- ✅ Hiring Manager: 8+ role fit
- ✅ HR Screen: Pass recommendation
- ✅ Project Manager: 7+ collaboration
- ✅ People & Culture: 8+ cultural fit
- ✅ Executive: 6+ leadership potential

## Tips

1. **Job Selection**: Choose challenging but realistic roles
2. **Fresh Sessions**: Start new Copilot chat for each interviewer persona
3. **Space Out**: Do different personas on different days
4. **Track Progress**: Maintain scores across interview types
5. **Iterate**: Update profile based on consistent feedback

Good luck with your interview preparation! 🚀
