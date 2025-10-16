#!/usr/bin/env python3
"""
Comprehensive Digital Twin Data Embedding Script
Embeds ALL data from digitaltwin.json into Upstash Vector Database
Including personal info, experience, projects, skills, education, etc.
"""

import os
import json
from dotenv import load_dotenv
from upstash_vector import Index
import time

# Load environment variables
load_dotenv('.env.local')

def flatten_dict(d, parent_key='', sep='_'):
    """Flatten nested dictionary into single level"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    items.extend(flatten_dict(item, f"{new_key}[{i}]", sep=sep).items())
                else:
                    items.append((f"{new_key}[{i}]", str(item)))
        else:
            items.append((new_key, v))
    return dict(items)

def create_comprehensive_chunks(data):
    """Create embeddings from all sections of the digital twin data"""
    chunks = []
    chunk_id = 0
    
    # 1. Personal Information
    if 'personal' in data:
        personal = data['personal']
        chunks.append({
            'id': f'personal-info',
            'data': f"Name: {personal.get('name', '')}. Title: {personal.get('title', '')}. Location: {personal.get('location', '')}. Summary: {personal.get('summary', '')}. Elevator Pitch: {personal.get('elevator_pitch', '')}",
            'metadata': {
                'title': f"Personal Information - {personal.get('name', 'Profile')}",
                'type': 'personal',
                'content': f"My name is {personal.get('name', '')}. I am a {personal.get('title', '')} based in {personal.get('location', '')}. {personal.get('summary', '')}",
                'category': 'identity',
                'tags': ['personal', 'identity', 'name', personal.get('name', '').lower()]
            }
        })
        
        # Contact info
        if 'contact' in personal:
            contact = personal['contact']
            contact_text = f"Email: {contact.get('email', '')}. Phone: {contact.get('phone', '')}. LinkedIn: {contact.get('linkedin', '')}. GitHub: {contact.get('github', '')}. Portfolio: {contact.get('portfolio', '')}"
            chunks.append({
                'id': 'contact-info',
                'data': contact_text,
                'metadata': {
                    'title': 'Contact Information',
                    'type': 'contact',
                    'content': contact_text,
                    'category': 'contact',
                    'tags': ['contact', 'email', 'phone', 'linkedin', 'github']
                }
            })
    
    # 2. Salary and Location
    if 'salary_location' in data:
        sal_loc = data['salary_location']
        sal_text = f"Current Salary: {sal_loc.get('current_salary', '')}. Mid-Level Expectations: {sal_loc.get('salary_expectations', {}).get('mid_level_roles', '')}. Senior Expectations: {sal_loc.get('salary_expectations', {}).get('senior_roles', '')}. Locations: {', '.join(sal_loc.get('location_preferences', []))}. Relocation: {sal_loc.get('relocation_willing', '')}. Remote Experience: {sal_loc.get('remote_experience', '')}. Work Authorization: {sal_loc.get('work_authorization', '')}."
        chunks.append({
            'id': 'salary-location',
            'data': sal_text,
            'metadata': {
                'title': 'Salary and Location Preferences',
                'type': 'compensation',
                'content': sal_text,
                'category': 'compensation',
                'tags': ['salary', 'location', 'remote', 'relocation']
            }
        })
    
    # 3. Experience (Each job)
    if 'experience' in data:
        for idx, exp in enumerate(data['experience']):
            exp_text = f"Company: {exp.get('company', '')}. Title: {exp.get('title', '')}. Duration: {exp.get('duration', '')}. Context: {exp.get('company_context', '')}. "
            
            # Add achievements
            if 'achievements_star' in exp:
                for ach_idx, ach in enumerate(exp['achievements_star']):
                    exp_text += f"Achievement {ach_idx + 1} - Situation: {ach.get('situation', '')}. Task: {ach.get('task', '')}. Action: {ach.get('action', '')}. Result: {ach.get('result', '')}. "
            
            # Add skills
            if 'technical_skills_used' in exp:
                exp_text += f"Skills: {', '.join(exp['technical_skills_used'])}."
            
            chunks.append({
                'id': f'experience-{idx}',
                'data': exp_text,
                'metadata': {
                    'title': f"{exp.get('title', '')} at {exp.get('company', '')}",
                    'type': 'experience',
                    'content': exp_text,
                    'category': 'work_experience',
                    'tags': ['experience', exp.get('company', '').lower(), exp.get('title', '').lower()]
                }
            })
    
    # 4. Projects Portfolio
    if 'projects_portfolio' in data:
        for idx, proj in enumerate(data['projects_portfolio']):
            proj_text = f"Project: {proj.get('name', '')}. Duration: {proj.get('duration', '')}. Description: {proj.get('description', '')}. Technologies: {', '.join(proj.get('technologies', []))}. Impact: {proj.get('impact', '')}."
            chunks.append({
                'id': f'project-{idx}',
                'data': proj_text,
                'metadata': {
                    'title': proj.get('name', 'Project'),
                    'type': 'project',
                    'content': proj_text,
                    'category': 'projects',
                    'tags': ['project'] + proj.get('technologies', [])
                }
            })
    
    # 5. Skills - Frontend
    if 'skills' in data and 'frontend' in data['skills']:
        frontend = data['skills']['frontend']
        fe_text = f"Primary Frontend Expertise: {', '.join(frontend.get('primary_expertise', []))}. UI Frameworks: {', '.join(frontend.get('ui_frameworks', []))}. State Management: {', '.join(frontend.get('state_management', []))}."
        chunks.append({
            'id': 'skills-frontend',
            'data': fe_text,
            'metadata': {
                'title': 'Frontend Skills',
                'type': 'skills',
                'content': fe_text,
                'category': 'technical_skills',
                'tags': ['frontend', 'react', 'nextjs', 'typescript']
            }
        })
    
    # 6. Skills - Backend
    if 'skills' in data and 'backend' in data['skills']:
        backend = data['skills']['backend']
        be_text = f"Backend Skills: {', '.join(backend.get('primary', []))}. APIs: {', '.join(backend.get('apis', []))}."
        chunks.append({
            'id': 'skills-backend',
            'data': be_text,
            'metadata': {
                'title': 'Backend Skills',
                'type': 'skills',
                'content': be_text,
                'category': 'technical_skills',
                'tags': ['backend', 'nodejs', 'python', 'api']
            }
        })
    
    # 7. Skills - Databases
    if 'skills' in data and 'databases' in data['skills']:
        db = data['skills']['databases']
        db_text = f"Database Experience: {', '.join(db.get('production_experience', []))}. Familiar With: {', '.join(db.get('familiar_with', []))}. ORM Tools: {', '.join(db.get('orm_tools', []))}."
        chunks.append({
            'id': 'skills-databases',
            'data': db_text,
            'metadata': {
                'title': 'Database Skills',
                'type': 'skills',
                'content': db_text,
                'category': 'technical_skills',
                'tags': ['database', 'postgresql', 'mongodb', 'sql']
            }
        })
    
    # 8. Skills - Cloud/DevOps
    if 'skills' in data and 'cloud_devops' in data['skills']:
        cloud = data['skills']['cloud_devops']
        cloud_text = f"AWS Services: {', '.join(cloud.get('aws', []))}. Platforms: {', '.join(cloud.get('platforms', []))}. CI/CD: {', '.join(cloud.get('cicd', []))}."
        chunks.append({
            'id': 'skills-cloud-devops',
            'data': cloud_text,
            'metadata': {
                'title': 'Cloud and DevOps Skills',
                'type': 'skills',
                'content': cloud_text,
                'category': 'technical_skills',
                'tags': ['cloud', 'aws', 'devops', 'cicd']
            }
        })
    
    # 9. Soft Skills
    if 'skills' in data and 'soft_skills' in data['skills']:
        soft = data['skills']['soft_skills']
        soft_text = f"Soft Skills: {', '.join(soft) if isinstance(soft, list) else soft}"
        chunks.append({
            'id': 'skills-soft',
            'data': soft_text,
            'metadata': {
                'title': 'Soft Skills',
                'type': 'skills',
                'content': soft_text,
                'category': 'soft_skills',
                'tags': ['soft skills', 'agile', 'collaboration', 'leadership']
            }
        })
    
    # 10. Education
    if 'education' in data:
        edu = data['education']
        edu_text = f"Degree: {edu.get('degree', '')}. University: {edu.get('university', '')}. Graduation: {edu.get('graduation_year', '')}. Location: {edu.get('location', '')}."
        chunks.append({
            'id': 'education',
            'data': edu_text,
            'metadata': {
                'title': 'Education',
                'type': 'education',
                'content': edu_text,
                'category': 'education',
                'tags': ['education', 'university', 'degree']
            }
        })
    
    # 11. Career Goals
    if 'career_goals' in data:
        goals = data['career_goals']
        goals_text = f"Current Level: {goals.get('current_level', '')}. Target: {goals.get('target_seniority', '')}. Short Term: {goals.get('short_term', '')}. Long Term: {goals.get('long_term', '')}. Learning Focus: {', '.join(goals.get('learning_focus', []))}."
        chunks.append({
            'id': 'career-goals',
            'data': goals_text,
            'metadata': {
                'title': 'Career Goals',
                'type': 'career',
                'content': goals_text,
                'category': 'career_goals',
                'tags': ['career', 'goals', 'learning']
            }
        })
    
    # 12. Professional Development
    if 'professional_development' in data:
        prof_dev = data['professional_development']
        
        # Certifications
        if 'certifications' in prof_dev:
            for cert in prof_dev['certifications']:
                cert_text = f"Certification: {cert.get('name', '')}. Issuer: {cert.get('issuer', '')}. Year: {cert.get('year', '')}. Skills: {', '.join(cert.get('skills', []))}."
                chunks.append({
                    'id': f"cert-{cert.get('name', '').lower().replace(' ', '-')}",
                    'data': cert_text,
                    'metadata': {
                        'title': f"Certification: {cert.get('name', '')}",
                        'type': 'certification',
                        'content': cert_text,
                        'category': 'professional_development',
                        'tags': ['certification', cert.get('issuer', '').lower()]
                    }
                })
    
    # 13. Technology Adaptation
    if 'technology_adaptation' in data:
        tech_adapt = data['technology_adaptation']
        if 'learning_track_record' in tech_adapt and 'fast_adoptions' in tech_adapt['learning_track_record']:
            adapt_text = f"Fast Technology Adoptions: {', '.join(tech_adapt['learning_track_record']['fast_adoptions'])}. Willingness: {tech_adapt.get('willingness_statement', '')}."
            chunks.append({
                'id': 'tech-adaptation',
                'data': adapt_text,
                'metadata': {
                    'title': 'Technology Adaptation',
                    'type': 'learning',
                    'content': adapt_text,
                    'category': 'learning_agility',
                    'tags': ['learning', 'adaptation', 'fast learner']
                }
            })
    
    # 14. Also include the pre-made content_chunks if they exist
    if 'content_chunks' in data:
        for chunk in data['content_chunks']:
            chunks.append({
                'id': chunk['id'],
                'data': chunk['content'],
                'metadata': {
                    'title': chunk.get('title', ''),
                    'type': chunk.get('type', ''),
                    'content': chunk['content'],
                    'category': chunk.get('metadata', {}).get('category', ''),
                    'tags': chunk.get('metadata', {}).get('tags', [])
                }
            })
    
    return chunks

def embed_to_upstash(chunks):
    """Embed all chunks into Upstash Vector database"""
    
    url = os.getenv('UPSTASH_VECTOR_REST_URL')
    token = os.getenv('UPSTASH_VECTOR_REST_TOKEN')
    
    if not url or not token:
        raise ValueError("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set")
    
    print(f"[Upstash] Connecting to vector database...")
    index = Index(url=url, token=token)
    
    print(f"[Upstash] Uploading {len(chunks)} chunks...")
    
    BATCH_SIZE = 10
    successful = 0
    failed = 0
    
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
        
        print(f"[Upstash] Batch {batch_num}/{total_batches} ({len(batch)} items)...")
        
        for chunk in batch:
            try:
                index.upsert(vectors=[chunk])
                successful += 1
                print(f"  ✓ {chunk['id']}: {chunk['metadata']['title']}")
            except Exception as e:
                failed += 1
                print(f"  ✗ {chunk['id']}: {str(e)}")
        
        if i + BATCH_SIZE < len(chunks):
            time.sleep(0.5)
    
    print(f"\n[Complete] Uploaded {successful}/{len(chunks)} chunks")
    return successful, failed

def main():
    print("=" * 70)
    print("COMPREHENSIVE Digital Twin Data Embedding")
    print("=" * 70)
    
    try:
        # Load data
        with open('digitaltwin.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("✓ Loaded digitaltwin.json")
        
        # Create comprehensive chunks
        chunks = create_comprehensive_chunks(data)
        print(f"✓ Created {len(chunks)} embedding chunks from all sections")
        
        # Upload to Upstash
        successful, failed = embed_to_upstash(chunks)
        
        print("\n" + "=" * 70)
        print(f"COMPLETE! Uploaded {successful} vectors to Upstash")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n[Error] {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
