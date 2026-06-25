'use client';

import React, { useState, useEffect } from 'react';
import { useProjects, generateId, saveProjects, getProjects, saveRecords } from '@/lib/crm/store';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Layout } from 'lucide-react';
import type { Project, RecordData } from '@/lib/crm/types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'manual' | 'ai' | 'db'>('ai');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dbUrl, setDbUrl] = useState('');
  const [dbDialect, setDbDialect] = useState<'postgres' | 'mysql' | 'sqlite'>('postgres');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');

  useEffect(() => {
    if (tab === 'ai') {
      const aiQuotes = [
        "“The goal is to turn data into information, and information into insight.” — Carly Fiorina",
        "“Simplicity is the ultimate sophistication in database schema design.” — Steve Jobs",
        "“A clean database architecture is the silent partner of customer success.” — CRM Architect Guide",
        "“Organize your fields by what you measure: people, transactions, and schedules.” — Northrosc Operations"
      ];
      setCurrentQuote(aiQuotes[Math.floor(Math.random() * aiQuotes.length)]);
    }
  }, [tab]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newProject: Project = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tables: [],
      forms: [],
      team: [],
      integrations: [],
      resources: []
    };
    const projects = getProjects();
    saveProjects([...projects, newProject]);
    onClose();
    router.push(`/crm/${newProject.id}`);
  };

  const handleAIGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    
    // Simulating intelligent dynamic CRM schema extraction based on the prompt text
    setTimeout(() => {
      const input = prompt.trim();
      const inputLower = input.toLowerCase();
      
      let projectName = "Custom CRM";
      const extractedTables: any[] = [];
      const extractedForms: any[] = [];
      
      // 1. Determine Project Name
      const bizMatch = input.match(/(?:i\s+run\s+a|i\s+have\s+a|we\s+are\s+a|system\s+for\s+a|crm\s+for\s+a)\s+([a-zA-Z0-9\s]+?)(?:with|\.|and|to\b|need\b|i\s+need\b)/i);
      if (bizMatch && bizMatch[1]) {
        const parsedName = bizMatch[1].trim();
        projectName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1) + " CRM";
      } else {
        const firstSentence = input.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length < 50 && firstSentence.length > 5) {
          projectName = firstSentence.replace(/i\s+want\s+to\s+track|i\s+need\s+a\s+system\s+to\s+manage|i\s+need/gi, '').trim();
          projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1) + " CRM";
        } else {
          projectName = "AI CRM Builder Project";
        }
      }

      // 2. Identify Niche to pre-populate custom templates
      let matchedNiche = false;
      
      const niches = [
        {
          keywords: ["clinic", "dental", "patient", "doctor", "hospital", "therapist", "health", "medical", "dentist", "physio", "chiropractic"],
          name: "Healthcare",
          tables: [
            {
              name: "Patients",
              fields: [
                { name: "Full Name", type: "Text" },
                { name: "Date of Birth", type: "Date" },
                { name: "Contact Number", type: "Phone" },
                { name: "Email Address", type: "Email" },
                { name: "Medical History", type: "Text" }
              ],
              views: ["Patients Directory"]
            },
            {
              name: "Appointments",
              fields: [
                { name: "Patient Name", type: "Text" },
                { name: "Date & Time", type: "Date" },
                { name: "Status", type: "Status", options: ["Scheduled", "Completed", "Cancelled", "No Show"] },
                { name: "Dentist/Doctor", type: "Text" },
                { name: "Treatment Notes", type: "Text" }
              ],
              views: ["Appointments Schedule"]
            },
            {
              name: "Treatments",
              fields: [
                { name: "Patient Name", type: "Text" },
                { name: "Treatment Type", type: "Text" },
                { name: "Cost", type: "Currency" },
                { name: "Date Conducted", type: "Date" }
              ],
              views: ["Billing & Records"]
            }
          ]
        },
        {
          keywords: ["bakery", "restaurant", "coffee", "cafe", "food", "bar", "hotel", "catering", "baking", "cake", "pastry"],
          name: "Food & Beverage",
          tables: [
            {
              name: "Menu Items",
              fields: [
                { name: "Item Name", type: "Text" },
                { name: "Category", type: "Status", options: ["Beverage", "Main Course", "Dessert", "Appetizer"] },
                { name: "Price", type: "Currency" },
                { name: "In Stock", type: "Boolean" },
                { name: "Description", type: "Text" }
              ],
              views: ["Menu Catalog"]
            },
            {
              name: "Orders",
              fields: [
                { name: "Order Identifier", type: "Text" },
                { name: "Items Ordered", type: "Text" },
                { name: "Total Amount", type: "Currency" },
                { name: "Status", type: "Status", options: ["Received", "Preparing", "Ready", "Paid", "Cancelled"] },
                { name: "Order Date", type: "Date" }
              ],
              views: ["Order Pipeline"]
            },
            {
              name: "Suppliers",
              fields: [
                { name: "Supplier Name", type: "Text" },
                { name: "Supply Items", type: "Text" },
                { name: "Contact Phone", type: "Phone" },
                { name: "Cost per Unit", type: "Currency" }
              ],
              views: ["Inventory & Suppliers"]
            }
          ]
        },
        {
          keywords: ["real estate", "property", "agent", "house", "apartment", "listing", "landlord", "brokerage", "tenant", "rent"],
          name: "Real Estate",
          tables: [
            {
              name: "Properties",
              fields: [
                { name: "Property Name / Address", type: "Text" },
                { name: "Asking Price", type: "Currency" },
                { name: "Property Type", type: "Status", options: ["House", "Apartment", "Condo", "Commercial Land"] },
                { name: "Bedrooms & Baths", type: "Number" },
                { name: "Status", type: "Status", options: ["Active Listing", "Contract Pending", "Sold", "Rented"] }
              ],
              views: ["All Listings"]
            },
            {
              name: "Viewings",
              fields: [
                { name: "Client Name", type: "Text" },
                { name: "Client Email", type: "Email" },
                { name: "Property of Interest", type: "Text" },
                { name: "Viewing Date", type: "Date" }
              ],
              views: ["Viewing Schedule"]
            },
            {
              name: "Agents",
              fields: [
                { name: "Agent Name", type: "Text" },
                { name: "Email", type: "Email" },
                { name: "Mobile", type: "Phone" },
                { name: "Commission Rate", type: "Number" }
              ],
              views: ["Agency Roster"]
            }
          ]
        },
        {
          keywords: ["school", "student", "class", "teacher", "course", "tutor", "lesson", "education", "academy", "coaching"],
          name: "Education & Academy",
          tables: [
            {
              name: "Students",
              fields: [
                { name: "Student Name", type: "Text" },
                { name: "Email", type: "Email" },
                { name: "Contact Phone", type: "Phone" },
                { name: "Grade Level", type: "Text" },
                { name: "Enrollment Date", type: "Date" }
              ],
              views: ["Student Database"]
            },
            {
              name: "Lessons",
              fields: [
                { name: "Subject / Topic", type: "Text" },
                { name: "Teacher Name", type: "Text" },
                { name: "Scheduled Time", type: "Date" },
                { name: "Status", type: "Status", options: ["Scheduled", "Completed", "Rescheduled"] }
              ],
              views: ["Lesson Calendar"]
            },
            {
              name: "Attendance",
              fields: [
                { name: "Student Name", type: "Text" },
                { name: "Lesson Topic", type: "Text" },
                { name: "Attended", type: "Boolean" },
                { name: "Remarks", type: "Text" }
              ],
              views: ["Attendance Records"]
            }
          ]
        },
        {
          keywords: ["gym", "trainer", "fitness", "workout", "membership", "yoga", "personal trainer", "athletics", "studio"],
          name: "Fitness & Gym",
          tables: [
            {
              name: "Members",
              fields: [
                { name: "Member Name", type: "Text" },
                { name: "Email", type: "Email" },
                { name: "Membership Tier", type: "Status", options: ["Basic", "Standard", "Premium", "VIP"] },
                { name: "Join Date", type: "Date" },
                { name: "Status", type: "Status", options: ["Active", "Suspended", "Expired"] }
              ],
              views: ["Members List"]
            },
            {
              name: "Training Sessions",
              fields: [
                { name: "Member Name", type: "Text" },
                { name: "Trainer", type: "Text" },
                { name: "Scheduled Date", type: "Date" },
                { name: "Workout Goal", type: "Text" }
              ],
              views: ["Session Planner"]
            },
            {
              name: "Trainer Directory",
              fields: [
                { name: "Trainer Name", type: "Text" },
                { name: "Specialization", type: "Text" },
                { name: "Hourly Cost", type: "Currency" }
              ],
              views: ["Trainers List"]
            }
          ]
        },
        {
          keywords: ["shop", "store", "product", "inventory", "stock", "retail", "e-commerce", "seller", "merchandise"],
          name: "Retail & Shop",
          tables: [
            {
              name: "Products",
              fields: [
                { name: "Product Name", type: "Text" },
                { name: "Price", type: "Currency" },
                { name: "Quantity in Stock", type: "Number" },
                { name: "Category", type: "Status", options: ["Electronics", "Apparel", "Home Goods", "Books", "Other"] },
                { name: "Active Listing", type: "Boolean" }
              ],
              views: ["Catalog Inventory"]
            },
            {
              name: "Orders",
              fields: [
                { name: "Customer Name", type: "Text" },
                { name: "Customer Email", type: "Email" },
                { name: "Product Ordered", type: "Text" },
                { name: "Order Date", type: "Date" },
                { name: "Total Amount", type: "Currency" },
                { name: "Status", type: "Status", options: ["Processing", "Shipped", "Delivered", "Returned"] }
              ],
              views: ["Order Dashboard"]
            },
            {
              name: "Suppliers",
              fields: [
                { name: "Supplier Company", type: "Text" },
                { name: "Contact Person", type: "Text" },
                { name: "Phone Number", type: "Phone" }
              ],
              views: ["Suppliers Database"]
            }
          ]
        },
        {
          keywords: ["agency", "consult", "advisor", "client", "marketing", "recruiting", "recruitment", "headhunter", "hr", "employee", "design", "law", "attorney", "legal"],
          name: "Professional Services",
          tables: [
            {
              name: "Clients",
              fields: [
                { name: "Client Company Name", type: "Text" },
                { name: "Primary Contact", type: "Text" },
                { name: "Email Address", type: "Email" },
                { name: "Service Agreement", type: "Status", options: ["Retainer", "Project-Based", "Ad-hoc Support"] },
                { name: "Status", type: "Status", options: ["Lead", "Active Partner", "Onboarding", "Completed", "Churned"] }
              ],
              views: ["Client CRM"]
            },
            {
              name: "Projects",
              fields: [
                { name: "Project Name", type: "Text" },
                { name: "Client Name", type: "Text" },
                { name: "Project Budget", type: "Currency" },
                { name: "Estimated Deadline", type: "Date" },
                { name: "Status", type: "Status", options: ["Kick-off", "Development", "QA / Client Review", "Approved"] }
              ],
              views: ["Projects Board"]
            },
            {
              name: "Invoices",
              fields: [
                { name: "Invoice Code", type: "Text" },
                { name: "Amount Due", type: "Currency" },
                { name: "Due Date", type: "Date" },
                { name: "Status", type: "Status", options: ["Draft", "Sent", "Paid", "Overdue"] }
              ],
              views: ["Billing Ledger"]
            }
          ]
        },
        {
          keywords: ["wedding", "event", "photography", "photographer", "party", "gallery", "booking", "celebration", "ceremony"],
          name: "Creative & Events",
          tables: [
            {
              name: "Bookings",
              fields: [
                { name: "Event Title", type: "Text" },
                { name: "Client Name", type: "Text" },
                { name: "Event Date", type: "Date" },
                { name: "Location Venue", type: "Text" },
                { name: "Package Cost", type: "Currency" },
                { name: "Status", type: "Status", options: ["Inquiry", "Booked", "Completed", "Cancelled"] }
              ],
              views: ["Event Bookings"]
            },
            {
              name: "Deliverables",
              fields: [
                { name: "Task/Asset Name", type: "Text" },
                { name: "Due Date", type: "Date" },
                { name: "Assigned Agent", type: "Text" },
                { name: "Completed", type: "Boolean" }
              ],
              views: ["Deliverables Checklist"]
            },
            {
              name: "Equipment",
              fields: [
                { name: "Item / Lens Name", type: "Text" },
                { name: "Serial Number", type: "Text" },
                { name: "In Use", type: "Boolean" }
              ],
              views: ["Equipment Inventory"]
            }
          ]
        },
        {
          keywords: ["car", "repair", "auto", "vehicle", "mechanic", "service", "garage", "maintenance", "fleet"],
          name: "Automotive Services",
          tables: [
            {
              name: "Vehicles & Owners",
              fields: [
                { name: "Owner Name", type: "Text" },
                { name: "Owner Phone", type: "Phone" },
                { name: "Vehicle Model", type: "Text" },
                { name: "License Plate", type: "Text" }
              ],
              views: ["Vehicles Directory"]
            },
            {
              name: "Service Orders",
              fields: [
                { name: "Job Summary", type: "Text" },
                { name: "Mechanic Name", type: "Text" },
                { name: "Estimated Cost", type: "Currency" },
                { name: "Scheduled Date", type: "Date" },
                { name: "Job Status", type: "Status", options: ["Diagnosis", "Waiting Parts", "In Repair", "Completed"] }
              ],
              views: ["Service Operations"]
            },
            {
              name: "Spare Parts",
              fields: [
                { name: "Part Name", type: "Text" },
                { name: "Stock Available", type: "Number" },
                { name: "Unit Cost", type: "Currency" }
              ],
              views: ["Spare Parts Inventory"]
            }
          ]
        }
      ];

      // Find the best niche match based on prompt content
      let matchedNicheObj = null;
      let maxMatches = 0;
      
      for (const niche of niches) {
        let matches = 0;
        for (const kw of niche.keywords) {
          if (inputLower.includes(kw)) {
            matches++;
          }
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          matchedNicheObj = niche;
        }
      }

      if (matchedNicheObj) {
        matchedNiche = true;
        projectName = projectName === "Custom CRM" ? `${matchedNicheObj.name} CRM` : projectName;
        
        for (const t of matchedNicheObj.tables) {
          const tableId = generateId();
          const fields = t.fields.map(f => ({
            id: generateId(),
            name: f.name,
            type: f.type as any,
            options: f.options || []
          }));
          
          extractedTables.push({
            id: tableId,
            name: t.name,
            views: t.views.map(vName => ({ id: generateId(), name: vName, type: "table" })),
            fields
          });
          
          // Auto-generate form for the first table
          if (extractedTables.length === 1) {
            extractedForms.push({
              id: generateId(),
              name: `${t.name} Intake Form`,
              tableId,
              fields: fields.map(f => ({
                id: generateId(),
                fieldId: f.id,
                label: f.name,
                required: f.name.toLowerCase().includes("name") || f.name.toLowerCase().includes("email")
              }))
            });
          }
        }
      }

      // 3. Fallback Heuristic Semantic Parser (When no niches match, extract noun targets from text)
      if (!matchedNiche) {
        const verbsPattern = /(?:track|manage|keep track of|list of|store|records for|register for|system for|collect)\s+([^.]+)/i;
        const match = input.match(verbsPattern);
        let potentialTableNames: string[] = [];
        
        if (match && match[1]) {
          const parts = match[1].split(/,|\band\b|\bor\b/gi);
          potentialTableNames = parts
            .map(p => p.trim())
            .filter(p => p.length > 2 && p.length < 25)
            .map(p => p.charAt(0).toUpperCase() + p.slice(1));
        }
        
        if (potentialTableNames.length === 0) {
          const words = input.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
          const pluralCandidate = words.filter(w => w.endsWith("s") && w.length > 3 && !["this", "needs", "does", "want", "requires", "operates"].includes(w.toLowerCase()));
          if (pluralCandidate.length > 0) {
            potentialTableNames = Array.from(new Set(pluralCandidate))
              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
              .slice(0, 3);
          } else {
            potentialTableNames = ["Contacts", "Activity Logs", "Inventory"];
          }
        }
        
        // Build dynamic tables based on inferred names
        for (const tName of potentialTableNames.slice(0, 4)) {
          const tableId = generateId();
          const lowerName = tName.toLowerCase();
          
          let fields: any[] = [];
          
          if (lowerName.includes("patient")) {
            fields = [
              { id: generateId(), name: "Full Name", type: "Text" },
              { id: generateId(), name: "Date of Birth", type: "Date" },
              { id: generateId(), name: "Phone", type: "Phone" },
              { id: generateId(), name: "Email", type: "Email" },
              { id: generateId(), name: "Status", type: "Status", options: ["Active", "Discharged", "On hold"] }
            ];
          } else if (lowerName.includes("bill") || lowerName.includes("invoice") || lowerName.includes("payment") || lowerName.includes("receipt") || lowerName.includes("transaction")) {
            fields = [
              { id: generateId(), name: "Invoice Code", type: "Text" },
              { id: generateId(), name: "Amount", type: "Currency" },
              { id: generateId(), name: "Due Date", type: "Date" },
              { id: generateId(), name: "Status", type: "Status", options: ["Draft", "Sent", "Paid", "Overdue"] }
            ];
          } else if (lowerName.includes("treatment") || lowerName.includes("history") || lowerName.includes("record")) {
            fields = [
              { id: generateId(), name: "Record Name", type: "Text" },
              { id: generateId(), name: "Details", type: "Text" },
              { id: generateId(), name: "Created Date", type: "Date" }
            ];
          } else if (lowerName.includes("book") || lowerName.includes("novel")) {
            fields = [
              { id: generateId(), name: "Book Title", type: "Text" },
              { id: generateId(), name: "Author Name", type: "Text" },
              { id: generateId(), name: "Publication Year", type: "Number" },
              { id: generateId(), name: "Genre", type: "Status", options: ["Fiction", "Non-Fiction", "Sci-Fi", "Mystery", "Biography"] }
            ];
          } else if (lowerName.includes("rental") || lowerName.includes("loan") || lowerName.includes("borrow")) {
            fields = [
              { id: generateId(), name: "Item Borrowed", type: "Text" },
              { id: generateId(), name: "Borrower Name", type: "Text" },
              { id: generateId(), name: "Date Checked Out", type: "Date" },
              { id: generateId(), name: "Due Date", type: "Date" },
              { id: generateId(), name: "Returned", type: "Boolean" }
            ];
          } else if (lowerName.includes("appointment") || lowerName.includes("booking") || lowerName.includes("schedule") || lowerName.includes("event") || lowerName.includes("meeting")) {
            fields = [
              { id: generateId(), name: "Event Name", type: "Text" },
              { id: generateId(), name: "Schedule Date", type: "Date" },
              { id: generateId(), name: "Attendee", type: "Text" },
              { id: generateId(), name: "Status", type: "Status", options: ["Confirmed", "Pending", "Cancelled"] }
            ];
          } else if (lowerName.includes("customer") || lowerName.includes("client") || lowerName.includes("user") || lowerName.includes("contact") || lowerName.includes("lead") || lowerName.includes("member") || lowerName.includes("subscriber") || lowerName.includes("student")) {
            fields = [
              { id: generateId(), name: "Full Name", type: "Text" },
              { id: generateId(), name: "Email Address", type: "Email" },
              { id: generateId(), name: "Phone Number", type: "Phone" },
              { id: generateId(), name: "Join Date", type: "Date" },
              { id: generateId(), name: "Status", type: "Status", options: ["Prospect", "Active", "Inactive"] }
            ];
          } else if (lowerName.includes("order") || lowerName.includes("sale") || lowerName.includes("deal") || lowerName.includes("opportunity")) {
            fields = [
              { id: generateId(), name: "Order Name", type: "Text" },
              { id: generateId(), name: "Total Value", type: "Currency" },
              { id: generateId(), name: "Date", type: "Date" },
              { id: generateId(), name: "Status", type: "Status", options: ["Draft", "Pending", "Approved", "Completed", "Cancelled"] }
            ];
          } else if (lowerName.includes("product") || lowerName.includes("item") || lowerName.includes("inventory") || lowerName.includes("stock") || lowerName.includes("equipment")) {
            fields = [
              { id: generateId(), name: "Item Name", type: "Text" },
              { id: generateId(), name: "Unit Cost", type: "Currency" },
              { id: generateId(), name: "Quantity", type: "Number" },
              { id: generateId(), name: "Available", type: "Boolean" }
            ];
          } else if (lowerName.includes("project") || lowerName.includes("task") || lowerName.includes("todo") || lowerName.includes("job") || lowerName.includes("ticket") || lowerName.includes("issue")) {
            fields = [
              { id: generateId(), name: "Title / Summary", type: "Text" },
              { id: generateId(), name: "Description", type: "Text" },
              { id: generateId(), name: "Deadline", type: "Date" },
              { id: generateId(), name: "Priority", type: "Status", options: ["Low", "Medium", "High", "Critical"] },
              { id: generateId(), name: "Completed", type: "Boolean" }
            ];
          } else if (lowerName.includes("employee") || lowerName.includes("staff") || lowerName.includes("dentist") || lowerName.includes("doctor") || lowerName.includes("teacher") || lowerName.includes("trainer") || lowerName.includes("agent") || lowerName.includes("mechanic")) {
            fields = [
              { id: generateId(), name: "Full Name", type: "Text" },
              { id: generateId(), name: "Role Title", type: "Text" },
              { id: generateId(), name: "Email", type: "Email" },
              { id: generateId(), name: "Phone", type: "Phone" }
            ];
          } else {
            fields = [
              { id: generateId(), name: `${tName.replace(/s$/, '')} Title`, type: "Text" },
              { id: generateId(), name: "Description / Notes", type: "Text" },
              { id: generateId(), name: "Date Created", type: "Date" },
              { id: generateId(), name: "Status", type: "Status", options: ["Draft", "Active", "Archived"] }
            ];
          }

          extractedTables.push({
            id: tableId,
            name: tName,
            views: [{ id: generateId(), name: `All ${tName}`, type: "table" }],
            fields
          });
        }

        if (extractedTables.length > 0) {
          const primaryTable = extractedTables[0];
          extractedForms.push({
            id: generateId(),
            name: `${primaryTable.name} Intake Form`,
            tableId: primaryTable.id,
            fields: primaryTable.fields.map((f: any) => ({
              id: generateId(),
              fieldId: f.id,
              label: f.name,
              required: f.name.toLowerCase().includes("name") || f.name.toLowerCase().includes("title")
            }))
          });
        }
      }

      // Generate mock records for each table to avoid the "deserted" feel
      extractedTables.forEach(t => {
        const tableRecords: RecordData[] = [];
        const numRecords = 3;
        
        const names = ["Alice Vance", "Marcus Brody", "Elena Fisher"];
        const emails = ["alice.v@example.com", "m.brody@example.com", "elena.f@example.com"];
        const phones = ["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 246-8135"];
        const companies = ["Northrosc Logistics", "Atlas Engineering", "Shoreline Media"];
        const titles = ["Initial Consultation", "Follow-up Meeting", "Contract Finalization"];
        
        for (let i = 0; i < numRecords; i++) {
          const rowData: Record<string, any> = {};
          t.fields.forEach((f: any) => {
            const lowerName = f.name.toLowerCase();
            if (f.type === "Text") {
              if (lowerName.includes("name")) {
                rowData[f.id] = names[i];
              } else if (lowerName.includes("company")) {
                rowData[f.id] = companies[i];
              } else if (lowerName.includes("title") || lowerName.includes("subject")) {
                rowData[f.id] = titles[i];
              } else {
                rowData[f.id] = `Sample ${f.name} ${i + 1}`;
              }
            } else if (f.type === "Email") {
              rowData[f.id] = emails[i];
            } else if (f.type === "Phone") {
              rowData[f.id] = phones[i];
            } else if (f.type === "Currency") {
              rowData[f.id] = (i + 1) * 1500;
            } else if (f.type === "Number") {
              rowData[f.id] = (i + 1) * 5;
            } else if (f.type === "Date") {
              const date = new Date();
              date.setDate(date.getDate() - i * 3);
              rowData[f.id] = date.toISOString().split('T')[0];
            } else if (f.type === "Checkbox" || f.type === "Boolean") {
              rowData[f.id] = i % 2 === 0;
            } else if (f.type === "Status") {
              rowData[f.id] = f.options && f.options.length > 0 ? f.options[i % f.options.length] : "";
            } else {
              rowData[f.id] = "";
            }
          });
          tableRecords.push({
            id: generateId(),
            tableId: t.id,
            createdAt: Date.now() - i * 3600000,
            data: rowData
          });
        }
        saveRecords(t.id, tableRecords);
      });

      const newProject: Project = {
        id: generateId(),
        name: projectName,
        description: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tables: extractedTables,
        forms: extractedForms,
        team: [
          { id: generateId(), email: "founder@northrosc.com", role: "Admin" }
        ],
        integrations: [],
        resources: [
          {
            id: generateId(),
            name: "AI Schema Extraction",
            type: "List",
            config: { parsedTables: extractedTables.map(t => t.name) }
          }
        ]
      };

      const projects = getProjects();
      saveProjects([...projects, newProject]);
      setIsGenerating(false);
      onClose();
      router.push(`/crm/${newProject.id}`);
    }, 2000);
  };

  const handleConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !name.trim()) return;
    setIsGenerating(true);

    // Simulate connecting to database and mapping schema elements automatically
    setTimeout(() => {
      const newProject: Project = {
        id: generateId(),
        name: name.trim(),
        description: `Imported CRM from ${dbDialect} server. Connection: ${dbUrl.substring(0, 30)}...`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tables: [
          {
            id: generateId(),
            name: 'imported_users',
            views: [{ id: generateId(), name: 'Active Users', type: 'table' }],
            fields: [
              { id: generateId(), name: 'id', type: 'Number' },
              { id: generateId(), name: 'email', type: 'Email' },
              { id: generateId(), name: 'name', type: 'Text' },
              { id: generateId(), name: 'created_at', type: 'Date' }
            ]
          },
          {
            id: generateId(),
            name: 'imported_orders',
            views: [{ id: generateId(), name: 'All Orders', type: 'table' }],
            fields: [
              { id: generateId(), name: 'id', type: 'Number' },
              { id: generateId(), name: 'amount', type: 'Currency' },
              { id: generateId(), name: 'status', type: 'Status', options: ['pending', 'completed', 'failed'] }
            ]
          }
        ],
        forms: [],
        team: [],
        integrations: [
          {
            id: generateId(),
            name: `${dbDialect.toUpperCase()} Sync`,
            type: 'Database',
            status: 'Active',
            config: { dialect: dbDialect, connectionString: dbUrl }
          }
        ],
        resources: [
          {
            id: generateId(),
            name: 'Database Health Indicator',
            type: 'Metric',
            config: { metric: 'connection', value: 'Healthy' }
          }
        ]
      };

      const projects = getProjects();
      saveProjects([...projects, newProject]);
      setIsGenerating(false);
      onClose();
      router.push(`/crm/${newProject.id}`);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[4px]">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-5 pt-1 bg-zinc-50/50">
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'manual'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('manual')}
          >
            <Layout className="h-3.5 w-3.5" />
            Manual Builder
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'ai'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('ai')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Builder
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'db'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('db')}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Connect Database
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., Sales CRM"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-24 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="Brief description of this project..."
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          {tab === 'ai' && (
            <div>
              <div className="space-y-4">
                {/* Quote block */}
                {currentQuote && (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 text-center text-xs italic text-zinc-500 font-serif leading-relaxed">
                    {currentQuote}
                  </div>
                )}

                {/* Directive sentences */}
                <div className="space-y-1.5 text-xs text-zinc-650 bg-zinc-50/40 p-3.5 rounded-lg border border-zinc-150 leading-normal">
                  <div className="font-semibold text-zinc-700 uppercase tracking-wider text-[10px]">AI Generation Directives</div>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-600">
                    <li>Describe your business model, products, or service offerings.</li>
                    <li>Specify what details you collect from clients or customers.</li>
                    <li>Detail what activities (e.g. appointments, orders, work tasks) you log.</li>
                  </ol>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Describe your business</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-28 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., I run a bakery and make wedding cakes. I want to keep track of clients and baking tasks."
                    autoFocus
                  />
                </div>

                {/* Keyword tip and AI context explanation */}
                <div className="rounded-md border border-violet-100 bg-violet-50/50 p-3 text-xs text-violet-750 leading-relaxed">
                  <span className="font-semibold block mb-1 text-violet-800">💡 Keyword Tips & Intelligent Inference</span>
                  <span>
                    Mentioning keywords like <strong>'leads'</strong>, <strong>'deals'</strong>, or <strong>'tickets'</strong> helps organize tables. However, you can describe your business in plain English (e.g. <em>"I run a pet grooming shop and need to track dog breeds, grooming packages, and appointments"</em>) and the AI will analyze your description to extract tables, fields, and intake forms for your specific business.
                  </span>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate CRM
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'db' && (
            <form onSubmit={handleConnectDb}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., Production DB CRM"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Database Dialect</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['postgres', 'mysql', 'sqlite'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDbDialect(d)}
                        className={`border rounded-lg p-2 text-center text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                          dbDialect === d
                            ? 'border-violet-600 bg-violet-50 text-violet-700'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Connection URI</label>
                  <input
                    type="text"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="postgresql://user:pass@host:5432/dbname"
                  />
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-800 leading-relaxed">
                  Connect your existing database. CRM Builder will analyze tables, relationships, and types to generate a ready-to-use CRM portal.
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dbUrl.trim() || !name.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Analyzing Database...
                    </>
                  ) : (
                    <>
                      Connect & Build
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
