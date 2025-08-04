import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { Background, Controls, MarkerType, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import env from '../../src/config/env';

const HierarchyPage = () => {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHOD, setIsHOD] = useState(false);

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };

  useEffect(() => {
    const buildHierarchy = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('raci_auth_token');

        const userResp = await fetch(`${env.apiBaseUrl}/auth/current-user`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        if (!userResp.ok) throw new Error(`user ${userResp.status}`);
        const userJson = await userResp.json();
        const currentUser = userJson.user || userJson;

        const companyId = currentUser.company?.id || currentUser.companyId || currentUser.company_id;
        if (!companyId) throw new Error('No company found');

        const compResp = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        const company = compResp.ok ? await compResp.json() : { name: currentUser.company?.name || 'Company' };

        // Get all departments first
        const deptResp = await fetch(`${env.apiBaseUrl}/companies/${companyId}/departments`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        let allDepartments = deptResp.ok ? await deptResp.json() : [];

        // Check if user is HOD
        const userIsHOD = currentUser.role && (
          currentUser.role.toLowerCase() === 'hod' || 
          currentUser.role.toLowerCase() === 'head of department' ||
          currentUser.role.toLowerCase().includes('hod')
        );
        
        setIsHOD(userIsHOD);
        
        let departments = allDepartments;
        let hodDepartment = null;

        // If user is HOD, find their specific department
        if (userIsHOD) {
          const hodDeptId = currentUser.department?.id || 
                           currentUser.departmentId || 
                           currentUser.department_id ||
                           currentUser.dept_id;
          
          // Primary resolution flow --------------------------------------------------
          if (hodDeptId) {
            // 1. Try to locate the department in the pre-fetched list
            hodDepartment = allDepartments.find(d =>
              d.id === hodDeptId ||
              d.id === parseInt(hodDeptId) ||
              d.id === String(hodDeptId)
            );
          }

          // Secondary resolution – search by HOD user id/email/name ---------------
          if (!hodDepartment) {
            hodDepartment = allDepartments.find(d =>
              d.hod && (
                d.hod.id === currentUser.id ||
                d.hod.email === currentUser.email ||
                (d.hod.name && d.hod.name.toLowerCase() === currentUser.name.toLowerCase())
              )
            );
          }

          // Tertiary resolution – direct fetch when we discovered an id -------------
          if (!hodDepartment && hodDeptId) {
            try {
              const hodDeptResp = await fetch(`${env.apiBaseUrl}/departments/${hodDeptId}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
              });
              if (hodDeptResp.ok) {
                hodDepartment = await hodDeptResp.json();
              }
            } catch (directErr) {
              // direct fetch failed – silently continue
            }
          }

          // Fallback by department name if still not found -------------------------
          if (!hodDepartment && currentUser.department?.name) {
            hodDepartment = allDepartments.find(d =>
              d.name && d.name.toLowerCase() === currentUser.department.name.toLowerCase()
            );
          }

          // Prepare final departments array ----------------------------------------
          departments = hodDepartment ? [hodDepartment] : [];
        }

        const hierarchyNodes = [];
        const hierarchyEdges = [];

        // 1. COMPANY NODE (Top Level)
        const companyNodeId = `company-${company.id || 'root'}`;
        hierarchyNodes.push({
          id: companyNodeId,
          type: 'default',
          data: { label: company.name },
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

        // 2. DEPARTMENTS (Second Level)
        const deptY = 280;
        const totalWidth = Math.max(departments.length * 500, 1200);
        const startX = 500 - (totalWidth / 2) + 250;

        for (let i = 0; i < departments.length; i++) {
          const dept = departments[i];
          const deptNodeId = `dept-${dept.id}`;
          const deptX = startX + (i * 500);

          // Use the actual department name
          const departmentName = dept.name || dept.department_name || `Department ${i + 1}`;

          hierarchyNodes.push({
            id: deptNodeId,
            type: 'default',
            data: { label: departmentName },
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
          
          hierarchyEdges.push({
            id: `e-comp-${dept.id}`,
            source: companyNodeId,
            target: deptNodeId,
            animated: true,
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 4 },
            markerEnd: { 
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color: '#8b5cf6'
            }
          });

          // 3. EMPLOYEES (Third Level)
          try {
            const singleDeptResp = await fetch(`${env.apiBaseUrl}/departments/${dept.id}`, {
              headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            
            let employees = [];
            let hod = null;
            
            if (singleDeptResp.ok) {
              const departmentFull = await singleDeptResp.json();
              employees = Array.isArray(departmentFull.employees) ? departmentFull.employees : [];
              hod = departmentFull.hod;
            } else {
              // department details fetch failed – fallback will trigger
            }

            let empIndex = 0;
            const empY = 500;
            const empSpacing = 250;
            
            // Calculate starting position for employees under this department
            const totalEmps = employees.length + (hod ? 1 : 0);
            const empStartX = deptX - ((totalEmps * empSpacing) / 2) + (empSpacing / 2);

            // Add HOD if exists
            if (hod) {
              const hodId = `hod-${hod.id}`;
              hierarchyNodes.push({
                id: hodId,
                type: 'default',
                data: { label: `${hod.name || hod.username || 'HOD'}\nHOD` },
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
              
              hierarchyEdges.push({
                id: `e-${dept.id}-hod`,
                source: deptNodeId,
                target: hodId,
                animated: true,
                type: 'smoothstep',
                style: { stroke: '#f59e0b', strokeWidth: 3 },
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
              const empName = emp.name || emp.username || `Employee ${j + 1}`;
              const roleLabel = emp.designation || emp.role || 'Employee';
              
              // Check if employee is Company Admin (role or designation contains 'admin')
              const isCompanyAdmin = (emp.role && /admin/i.test(emp.role)) || (emp.designation && /admin/i.test(emp.designation));
              
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
                data: { label: `${empName}\n(${roleLabel})` },
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
                id: `e-${dept.id}-emp-${emp.id}`,
                source: deptNodeId,
                target: empNodeId,
                animated: true,
                type: 'smoothstep',
                style: { stroke: edgeColor, strokeWidth: 3 },
                markerEnd: { 
                  type: MarkerType.ArrowClosed,
                  width: 18,
                  height: 18,
                  color: edgeColor
                }
              });
              empIndex++;
            }
          } catch (err) {
            // department detail fetch failed – continue loop
          }
        }

        // ADD UNASSIGNED COMPANY ADMIN USERS (green tiles)
        try {
          const adminResp = await fetch(`${env.apiBaseUrl}/companies/${companyId}/users`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          });
          if (adminResp.ok) {
            const { users: allUsers = [] } = await adminResp.json();
            const unassignedAdmins = allUsers.filter(u =>
              u.role && u.role.toLowerCase().includes('admin')
            );

            const adminY = deptY - 120; // between company and departments
            const adminSpacing = 250;
            const totalAdminWidth = Math.max(unassignedAdmins.length * adminSpacing, adminSpacing);
            let adminX = 500 - (totalAdminWidth / 2) + adminSpacing / 2;

            for (const admin of unassignedAdmins) {
              const nodeId = `admin-${admin.id}`;
              if (hierarchyNodes.some(n => n.id === nodeId)) {
                continue;
              }
              hierarchyNodes.push({
                id: nodeId,
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
                target: nodeId,
                animated: true,
                type: 'smoothstep',
                style: { stroke: '#10b981', strokeWidth: 3 },
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#10b981' }
              });

              adminX += adminSpacing;
            }
          }
        } catch (caErr) {
          // ignore admin fetch errors
        }

        // Handle case where HOD has no department found or no employees
        if (userIsHOD && departments.length === 0) {
          // creating fallback department for HOD
          
          // Create a fallback department using user's department info
          const deptName = currentUser.department?.name || 'Your Department';
          
          hierarchyNodes.push({
            id: 'fallback-dept',
            type: 'default',
            data: { label: deptName },
            position: { x: 500, y: 280 },
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
          
          hierarchyEdges.push({
            id: 'edge-company-fallback',
            source: companyNodeId,
            target: 'fallback-dept',
            animated: true,
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 4 },
            markerEnd: { 
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color: '#8b5cf6'
            }
          });
          
          // Add HOD node for current user
          hierarchyNodes.push({
            id: 'fallback-hod',
            type: 'default',
            data: { label: `${currentUser.name || currentUser.username || 'You'}\nHOD` },
            position: { x: 500, y: 500 },
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
          
          hierarchyEdges.push({
            id: 'edge-dept-fallback-hod',
            source: 'fallback-dept',
            target: 'fallback-hod',
            animated: true,
            type: 'smoothstep',
            style: { stroke: '#f59e0b', strokeWidth: 3 },
            markerEnd: { 
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: '#f59e0b'
            }
          });
        }

        // After building department / employee nodes, if hierarchy still only has the company node,
        // create a fallback using the user's department so that something always shows for HOD.
        if (userIsHOD && hierarchyNodes.length === 1) {
          const fallbackDeptName = currentUser.department?.name || 'Your Department';
          const fallbackDeptId = currentUser.department?.id || 'fallback';

          hierarchyNodes.push({
            id: `dept-${fallbackDeptId}`,
            type: 'default',
            data: { label: fallbackDeptName },
            position: { x: 500, y: 280 },
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

          hierarchyEdges.push({
            id: `edge-company-${fallbackDeptId}`,
            source: companyNodeId,
            target: `dept-${fallbackDeptId}`,
            animated: true,
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 4 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: '#8b5cf6' }
          });
        }

        // hierarchy build complete
        
        setNodes(hierarchyNodes);
        setEdges(hierarchyEdges);
        
      } catch (err) {
        console.error('Hierarchy build failed', err);
        setError('Unable to load hierarchy.');
      } finally {
        setLoading(false);
      }
    };

    buildHierarchy();
  }, [setNodes, setEdges]);

  if (loading) return <div style={{ padding: '1rem' }}>Loading hierarchy...</div>;
  if (error) return <div style={{ padding: '1rem', color: '#b91c1c' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: 'bold' }}>
          {isHOD ? 'Department Hierarchy' : 'Organisation Hierarchy'}
        </h1>
      </div>
      
      <div style={{ 
        height: 'calc(100vh - 200px)', 
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
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ 
            animated: true, 
            type: 'smoothstep', 
            markerEnd: { type: MarkerType.ArrowClosed }, 
            style: { stroke: '#2563eb', strokeWidth: 2 } 
          }}
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

export default HierarchyPage; 