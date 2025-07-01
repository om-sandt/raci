import React, { useState, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  useNodesState, 
  useEdgesState 
} from 'reactflow';
import 'reactflow/dist/style.css';
import env from '../../src/config/env';

const CompanyAdminHierarchy = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const buildHierarchy = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('raci_auth_token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        // Get current user
        const userResp = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userResp.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await userResp.json();
        const currentUser = userData.user || userData;
        const companyId = currentUser.company?.id || currentUser.companyId || currentUser.company_id;

        if (!companyId) {
          throw new Error('No company found for user');
        }

        // Get company details
        const companyResp = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const company = companyResp.ok ? await companyResp.json() : { 
          id: companyId, 
          name: currentUser.company?.name || 'My Company' 
        };

        // Get departments
        const deptResp = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let departments = [];
        if (deptResp.ok) {
          departments = await deptResp.json();
        }

        // Filter departments for HOD role
        if (currentUser.role && currentUser.role.toLowerCase() === 'hod') {
          const hodDeptId = currentUser.department?.id || currentUser.departmentId || currentUser.department_id;
          if (hodDeptId) {
            departments = departments.filter(d => d.id === hodDeptId);
          }
        }

        const hierarchyNodes = [];
        const hierarchyEdges = [];

        // 1. COMPANY NODE (Top Level) - Tree Root
        const companyNodeId = `company-${company.id}`;
        hierarchyNodes.push({
          id: companyNodeId,
          type: 'default',
          data: { label: company.name || 'Company' },
          position: { x: 500, y: 50 },
                      style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px 28px',
              borderRadius: '12px',
              fontSize: '22px',
              fontWeight: 'bold',
              minWidth: '280px',
              textAlign: 'center',
              border: '3px solid #4c51bf',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
            },
          sourcePosition: 'bottom'
        });

        // 2. DEPARTMENTS (Second Level) - Tree Branches
        const deptY = 280;
        const totalWidth = Math.max(departments.length * 400, 1000);
        const startX = 500 - (totalWidth / 2) + 200;

        for (let i = 0; i < departments.length; i++) {
          const dept = departments[i];
          const deptNodeId = `dept-${dept.id}`;
          const deptX = startX + (i * 400);

          // Department node
          hierarchyNodes.push({
            id: deptNodeId,
            type: 'default',
            data: { label: dept.name || `Department ${i + 1}` },
            position: { x: deptX, y: deptY },
            style: {
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '16px 22px',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: '600',
              minWidth: '240px',
              textAlign: 'center',
              border: '2px solid #e53e3e',
              boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
            },
            sourcePosition: 'bottom',
            targetPosition: 'top'
          });

          // Edge from company to department
          hierarchyEdges.push({
            id: `edge-company-${dept.id}`,
            source: companyNodeId,
            target: deptNodeId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 4
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color: '#8b5cf6'
            }
          });

          // 3. EMPLOYEES (Third Level) - Tree Leaves
          try {
            const employeesResp = await fetch(`${env.apiBaseUrl}/departments/${dept.id}`, {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (employeesResp.ok) {
              const deptDetails = await employeesResp.json();
              const employees = Array.isArray(deptDetails.employees) ? deptDetails.employees : [];
              const hod = deptDetails.hod;

              let empIndex = 0;
              const empY = 500;
              const empSpacing = 220;
              
              // Calculate starting position for employees under this department
              const empStartX = deptX - ((employees.length + (hod ? 1 : 0)) * empSpacing) / 2 + empSpacing / 2;

              // Add HOD if exists
              if (hod) {
                const hodNodeId = `hod-${hod.id}`;
                hierarchyNodes.push({
                  id: hodNodeId,
                  type: 'default',
                  data: { 
                    label: `${hod.name}\nHOD` 
                  },
                  position: { x: empStartX + (empIndex * empSpacing), y: empY },
                  style: {
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    minWidth: '160px',
                    textAlign: 'center',
                    whiteSpace: 'pre-line',
                    border: '2px solid #d97706',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  },
                  targetPosition: 'top'
                });

                // Edge from department to HOD
                hierarchyEdges.push({
                  id: `edge-dept-${dept.id}-hod-${hod.id}`,
                  source: deptNodeId,
                  target: hodNodeId,
                  type: 'smoothstep',
                  animated: true,
                  style: {
                    stroke: '#f59e0b',
                    strokeWidth: 3
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 18,
                    height: 18,
                    color: '#f59e0b'
                  }
                });
                empIndex++;
              }

              // Add regular employees
              for (let j = 0; j < employees.length; j++) {
                const emp = employees[j];
                const empNodeId = `emp-${emp.id}`;
                
                // Detect Company Admin by role or designation containing "admin" (case-insensitive)
                const isCompanyAdmin = (emp.role && /admin/i.test(emp.role)) ||
                                      (emp.designation && /admin/i.test(emp.designation));
                
                let empStyle = {
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  border: '2px solid #3182ce'
                };

                // Different style for Company Admin
                if (isCompanyAdmin) {
                  empStyle = {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '2px solid #047857'
                  };
                }

                hierarchyNodes.push({
                  id: empNodeId,
                  type: 'default',
                  data: { 
                    label: `${emp.name || `Employee ${j + 1}`}\n${emp.designation || emp.role || 'Employee'}` 
                  },
                  position: { x: empStartX + (empIndex * empSpacing), y: empY },
                  style: {
                    ...empStyle,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '160px',
                    textAlign: 'center',
                    whiteSpace: 'pre-line',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  },
                  targetPosition: 'top'
                });

                // Edge from department to employee
                const edgeColor = isCompanyAdmin ? '#10b981' : '#06b6d4';
                hierarchyEdges.push({
                  id: `edge-dept-${dept.id}-emp-${emp.id}`,
                  source: deptNodeId,
                  target: empNodeId,
                  type: 'smoothstep',
                  animated: true,
                  style: {
                    stroke: edgeColor,
                    strokeWidth: 3
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 18,
                    height: 18,
                    color: edgeColor
                  }
                });
                empIndex++;
              }
            }
          } catch (empError) {
            console.warn(`Failed to fetch employees for department ${dept.id}:`, empError);
          }
        }

        // ADD UNASSIGNED COMPANY ADMINS
        try {
          const allUsersResp = await fetch(`${env.apiBaseUrl}/companies/${company.id}/users`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (allUsersResp.ok) {
            const { users: allUsers = [] } = await allUsersResp.json();
            const unassignedAdmins = allUsers.filter(u =>
              (u.role && /admin/i.test(u.role)) || (u.designation && /admin/i.test(u.designation))
            );

            const adminY = deptY - 120; // between company and departments
            const adminSpacing = 250;
            const totalAdminWidth = Math.max(unassignedAdmins.length * adminSpacing, adminSpacing);
            let adminX = 500 - (totalAdminWidth / 2) + adminSpacing / 2;

            for (const admin of unassignedAdmins) {
              const adminNodeId = `admin-${admin.id}`;
              // skip if node already exists (e.g., admin included as department employee)
              if (hierarchyNodes.some(n => n.id === adminNodeId)) { continue; }
              hierarchyNodes.push({
                id: adminNodeId,
                type: 'default',
                data: { label: `${admin.name || admin.email}\nCompany Admin` },
                position: { x: adminX, y: adminY },
                style: {
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  minWidth: '160px',
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                  border: '2px solid #047857',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                },
                targetPosition: 'top'
              });

              hierarchyEdges.push({
                id: `edge-company-admin-${admin.id}`,
                source: companyNodeId,
                target: adminNodeId,
                type: 'smoothstep',
                animated: true,
                style: {
                  stroke: '#10b981',
                  strokeWidth: 3
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 18,
                  height: 18,
                  color: '#10b981'
                }
              });

              adminX += adminSpacing;
            }
          }
        } catch (adminErr) {
          // ignore admin fetch errors
        }

        // Add test structure if no real data
        if (hierarchyEdges.length === 0) {
          // Test department
          hierarchyNodes.push({
            id: 'test-dept-1',
            type: 'default',
            data: { label: 'Test Department' },
            position: { x: 500, y: 280 },
            style: {
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '14px 18px',
              borderRadius: '10px',
              fontSize: '16px',
              textAlign: 'center',
              border: '2px solid #e53e3e',
              boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
            }
          });

          // Test HOD
          hierarchyNodes.push({
            id: 'test-hod',
            type: 'default',
            data: { label: 'Test HOD\nHOD' },
            position: { x: 390, y: 500 },
            style: {
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              border: '2px solid #d97706',
              whiteSpace: 'pre-line'
            }
          });

          // Test Employee
          hierarchyNodes.push({
            id: 'test-emp',
            type: 'default',
            data: { label: 'Test Employee\nEmployee' },
            position: { x: 610, y: 500 },
            style: {
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              border: '2px solid #3182ce',
              whiteSpace: 'pre-line'
            }
          });

          // Test edges
          hierarchyEdges.push(
            {
              id: 'test-edge-1',
              source: companyNodeId,
              target: 'test-dept-1',
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 4 },
              markerEnd: { type: MarkerType.ArrowClosed }
            },
            {
              id: 'test-edge-2',
              source: 'test-dept-1',
              target: 'test-hod',
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#f59e0b', strokeWidth: 3 },
              markerEnd: { type: MarkerType.ArrowClosed }
            },
            {
              id: 'test-edge-3',
              source: 'test-dept-1',
              target: 'test-emp',
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#06b6d4', strokeWidth: 3 },
              markerEnd: { type: MarkerType.ArrowClosed }
            }
          );
        }

        setNodes(hierarchyNodes);
        setEdges(hierarchyEdges);

      } catch (err) {
        console.error('Error building hierarchy:', err);
        setError(err.message);

        // Fallback with tree structure
        const fallbackNodes = [
          {
            id: 'company-fallback',
            data: { label: 'Your Company' },
            position: { x: 500, y: 50 },
            style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '18px 24px',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: 'bold'
            }
          },
          {
            id: 'dept-fallback',
            data: { label: 'Sample Department' },
            position: { x: 500, y: 280 },
            style: {
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '14px 18px',
              borderRadius: '10px',
              fontSize: '16px'
            }
          }
        ];

        const fallbackEdges = [
          {
            id: 'fallback-edge',
            source: 'company-fallback',
            target: 'dept-fallback',
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#8b5cf6',
              strokeWidth: 4
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color: '#8b5cf6'
            }
          }
        ];

        setNodes(fallbackNodes);
        setEdges(fallbackEdges);
      } finally {
        setLoading(false);
      }
    };

    buildHierarchy();
  }, [setNodes, setEdges]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Company Hierarchy...</h2>
        <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
          Fetching company structure...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Error Loading Hierarchy</h2>
        <p style={{ color: '#666', marginTop: '1rem' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', height: '100vh' }}>
      <div style={{ 
        marginBottom: '1rem'
      }}>
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: 'bold' }}>
          Company Hierarchy
        </h1>
      </div>

      <div style={{ 
        height: 'calc(100vh - 120px)', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} size={2} color="#94a3b8" />
          <Controls />
          
          {/* Legend - Top Right */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            fontSize: '13px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1f2937', fontSize: '14px' }}>
              Organization Structure
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                marginRight: '8px',
                borderRadius: '4px',
                border: '1px solid #4c51bf'
              }}></div>
              Company
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
                marginRight: '8px',
                borderRadius: '4px',
                border: '1px solid #e53e3e'
              }}></div>
              Departments
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                marginRight: '8px',
                borderRadius: '4px',
                border: '1px solid #d97706'
              }}></div>
              HOD
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                marginRight: '8px',
                borderRadius: '4px',
                border: '1px solid #047857'
              }}></div>
              Company Admin
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
                marginRight: '8px',
                borderRadius: '4px',
                border: '1px solid #3182ce'
              }}></div>
              Employees
            </div>
                         <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
               Purple: Company → Dept<br/>
               Orange: Dept → HOD<br/>
               Cyan: Dept → Employee
             </div>
          </div>
        </ReactFlow>
      </div>
    </div>
  );
};

export default CompanyAdminHierarchy;