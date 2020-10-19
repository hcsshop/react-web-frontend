import React from 'react'
import { Layout, Menu } from 'antd'

// import { store } from '../../store'

const { SubMenu } = Menu
const { Sider } = Layout

const Sidebar = props => {
  // const Store = useContext(store)
  // const { state, dispatch } = Store
  const { actions } = props

  const openKeys = []
  actions.forEach(action => {
    const key = Math.random().toString(36)
    action.key = key
    openKeys.push(key)
    action.items.forEach(item => {
      const key = Math.random().toString(36)
      item.key = key
    })
  })

  return (
    <Sider width={200} breakpoint='sm' theme='dark' collapsible>
      <Menu
        key={Math.random().toString(36)}
        mode='inline'
        theme='dark'
        defaultOpenKeys={openKeys}
        className='sidebar-action-menu'
        style={{ height: '100%', borderRight: 0 }}
      >
        {
          actions && actions.map(action => {
            return (
              <SubMenu key={action.key} icon={action.icon} title={action.title} className='sidebar-action-submenu'>
                {
                  action.items.map(item => {
                    return (
                      <Menu.Item key={Math.random().toString(36)} className='sidebar-action-submenu-item' onClick={() => item.onClick ? item.onClick() : null}>
                        {item.icon}
                        {item.title}
                      </Menu.Item>
                    )
                  })
                }
              </SubMenu>
            )
          })
        }
      </Menu>
    </Sider>
  )
}

export default Sidebar
