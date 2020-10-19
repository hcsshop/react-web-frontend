import React, { useState, useEffect } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Layout, Divider, Collapse, List, Modal, Input, Radio, Switch, Breadcrumb, InputNumber, PageHeader, Button, message } from 'antd'
import { SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/themes/prism-dark.css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'

import TopNav from '../TopNav/TopNav'
import client from '../../feathers/client'

const { Panel } = Collapse

const Settings = () => {
  const [settings, setSettings] = useState(null)
  const [categories, setCategories] = useState(null)
  const [newSettings, setNewSettings] = useState(null)
  const [newSettingKey, setNewSettingKey] = useState(null)
  const [newSettingType, setNewSettingType] = useState('text')
  const [newSettingValue, setNewSettingValue] = useState(null)
  const [newSettingTitle, setNewSettingTitle] = useState(null)
  const [newSettingsCode, setNewSettingsCode] = useState(null)
  const [newSettingComment, setNewSettingComment] = useState(null)
  const [newSettingCategory, setNewSettingCategory] = useState(null)
  const [showNewSettingModal, setShowNewSettingModal] = useState(false)

  const history = useHistory()

  useEffect(() => {
    const getSettings = async () => {
      const currentSettings = await client.service('settings').find({ query: { $limit: -1 } })

      const cats = new Set()
      for (const setting of currentSettings) if (setting.category !== 'Hidden') cats.add(setting.category)

      setCategories(cats)
      setSettings(currentSettings)
      setNewSettings(currentSettings)
      setNewSettingsCode(JSON.stringify(currentSettings, null, 2))
    }

    if (!settings) getSettings()
  }, [categories, settings, newSettings])

  const saveSettings = async () => {
    try {
      const settingsData = JSON.parse(newSettingsCode)
      settingsData.forEach(async setting => {
        delete setting._id
        console.log(setting.key, { ...setting })
        await client.service('settings').update(setting.key, { ...setting })
        setSettings(null)
      })

      message.success('Settings saved!')
    } catch (err) {
      console.error(err)
      message.error('Failed to save settings!')
    }
  }

  const deleteSetting = async key => {
    console.log('Deleting setting:', key)

    try {
      await client.service('settings').remove(key)
      message.success(`Setting ${key} was deleted`, 2)
      setSettings(null)
    } catch (err) {
      console.error(err)
      message.error('An error occurred deleting the setting, please try again.', 5)
    }
  }

  const updateSetting = e => {
    if (!newSettings) return
    if (e && e.persist) e.persist()

    const data = newSettings.map((setting, index) => ({ index, setting }))
    const setting = data.filter(s => s.setting.key === e.target.dataset.key)[0]

    switch (e.target.dataset.type) {
      case 'number':
        setNewSettings(ns => {
          const cloned = [...ns]
          cloned[setting.index] = { ...setting.setting, number: parseFloat(e.target.value) }
          return cloned
        })
        break

      case 'text':
        setNewSettings(ns => {
          const cloned = [...ns]
          cloned[setting.index] = { ...setting.setting, text: e.target.value }
          return cloned
        })
        break

      case 'boolean':
        setNewSettings(ns => {
          const cloned = [...ns]
          cloned[setting.index] = { ...setting.setting, enabled: e.target.checked }
          return cloned
        })
        break

      default:
        break
    }
  }

  useEffect(() => {
    setNewSettingsCode(JSON.stringify(newSettings, null, 2))
  }, [newSettings])

  useEffect(() => {
    setNewSettingValue(null)
  }, [newSettingType])

  return (
    <Layout>
      <TopNav />
      <Layout>
        <Layout style={{ padding: '0 24px 24px', minHeight: '100vh' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item><Link to='/'>{process.env.REACT_APP_SERVICESHOP_NAME || 'Home'}</Link></Breadcrumb.Item>
            <Breadcrumb.Item>Settings</Breadcrumb.Item>
          </Breadcrumb>

          <Modal
            visible={showNewSettingModal}
            title={<h3>Add New Setting</h3>}
            className='settings-add-new-modal'
            okText={
              <>
                <SaveOutlined style={{ position: 'relative', top: '-3px' }} />
                <span>Save</span>
              </>
            }
            onCancel={() => {
              setNewSettingKey(null)
              setNewSettingComment(null)
              setNewSettingType('text')
              setNewSettingValue(null)
              setShowNewSettingModal(false)
            }}
            onOk={async e => {
              const setting = {
                key: newSettingKey,
                type: newSettingType,
                title: newSettingTitle,
                comment: newSettingComment,
                category: newSettingCategory && newSettingCategory !== '' ? newSettingCategory : 'Other'
              }

              switch (newSettingType) {
                case 'text':
                  setting.text = newSettingValue || ''; break
                case 'number':
                  setting.number = Number(newSettingValue) || 0; break
                case 'boolean':
                  setting.enabled = Boolean(newSettingValue); break
                default:
                  setting.text = newSettingValue
              }

              try {
                await client.service('settings').create(setting)
                setNewSettingKey(null)
                setNewSettingComment(null)
                setNewSettingType('text')
                setNewSettingValue(null)
                setShowNewSettingModal(false)
                setSettings(null)
              } catch (err) {
                console.error(err)
                message.error('An error occurred saving the new setting. Please try again.')
              }
            }}
          >
            <Input placeholder='Setting Key' value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} autoFocus />
            <Input placeholder='Setting Title' value={newSettingTitle} onChange={e => setNewSettingTitle(e.target.value)} style={{ marginTop: '1em' }} />
            <Input placeholder='Setting Comment' value={newSettingComment} onChange={e => setNewSettingComment(e.target.value)} style={{ marginTop: '1em' }} />
            <Input placeholder='Setting Category' value={newSettingCategory} onChange={e => setNewSettingCategory(e.target.value)} style={{ marginTop: '1em' }} />
            <Divider />

            <strong>Setting Type:</strong>
            <Radio.Group onChange={e => setNewSettingType(e.target.value)} defaultValue='text' style={{ marginLeft: '2em' }}>
              <Radio.Button value='text'>Text</Radio.Button>
              <Radio.Button value='boolean'>Toggle</Radio.Button>
              <Radio.Button value='number'>Number</Radio.Button>
            </Radio.Group>
            <Divider />

            {newSettingType === 'text' && <Input placeholder='Setting Value' value={newSettingValue || ''} onChange={e => setNewSettingValue(e.target.value)} />}
            {newSettingType === 'number' && <InputNumber placeholder='Setting Value' value={Number(newSettingValue) || 0} onChange={value => setNewSettingValue(value)} style={{ width: '100%' }} />}
            {newSettingType === 'boolean' && <Switch checked={Boolean(newSettingValue) || false} onChange={value => setNewSettingValue(value)} />}
          </Modal>

          <PageHeader
            title={<h3>Settings</h3>}
            onBack={() => history.goBack()}
            style={{ marginBottom: '2em' }}
            extra={
              <Button onClick={() => setShowNewSettingModal(true)}>
                <PlusOutlined style={{ position: 'relative', top: '-3px' }} />
                <span>New Setting</span>
              </Button>
            }
          />

          {
            newSettings &&
              <div className='animate__animated animate__slideInUp animate__faster'>
                <Collapse defaultActiveKey={Array.from(categories)}>
                  {
                    categories && categories.size > 0 &&
                      Array.from(categories).sort((a, b) => (a > b) ? 1 : ((b > a) ? -1 : 0)).map(cat => (
                        <Panel
                          key={cat}
                          header={<h3>{cat}</h3>}
                        >
                          <List
                            itemLayout='horizontal'
                            dataSource={
                              newSettings
                                .filter(s => s.category === cat)
                                .sort((a, b) => (a.key > b.key) ? 1 : ((b.key > a.key) ? -1 : 0))
                            }
                            renderItem={setting => {
                              const actions = []

                              switch (setting.type) {
                                case 'boolean':
                                  actions.push((
                                    <Switch
                                      defaultChecked={setting.enabled}
                                      onChange={(checked, e) => updateSetting({ ...e, target: { checked, dataset: { key: setting.key, type: setting.type } } })}
                                    />
                                  ))
                                  break
                                case 'text':
                                  actions.push((
                                    <Input
                                      value={setting.text}
                                      onChange={updateSetting}
                                      data-key={setting.key}
                                      data-type={setting.type}
                                      style={setting.text && { minWidth: `${setting.text.length > 50 ? 50 : setting.text.length}ch` }}
                                    />
                                  ))
                                  break
                                case 'number':
                                  actions.push(
                                    <InputNumber
                                      value={setting.number}
                                      onChange={value => updateSetting({ target: { value, dataset: { key: setting.key, type: setting.type } } })}
                                    />
                                  )
                                  break
                                default:
                                  break
                              }

                              return (
                                <List.Item
                                  key={setting.key}
                                  actions={actions}
                                >
                                  <List.Item.Meta
                                    description={setting.comment}
                                    title={
                                      <>
                                        <strong title={setting.title ? setting.key : ''}>{setting.title || setting.key}</strong>
                                        <DeleteOutlined onClick={() => deleteSetting(setting.key)} title={`Delete ${setting.key}`} className='ml-1' style={{ color: '#c00', position: 'relative', top: '-3px', cursor: 'pointer' }} />
                                      </>
                                    }
                                  />
                                </List.Item>
                              )
                            }}
                          />
                        </Panel>
                      ))
                  }
                </Collapse>

                <Divider />
                <Button type='primary' size='large' block onClick={saveSettings}>Save Settings</Button>
                <Divider />
              </div>
          }

          {
            newSettings && newSettingsCode && process.env.REACT_APP_SHOW_RAW_SETTINGS_EDITOR === 'true' &&
              <Collapse className='animate__animated animate__slideInUp animate__faster'>
                <Panel
                  header={<><h3>Raw Settings Editor</h3><p className='text-muted font-italic'>Be careful with this!</p></>}
                >
                  <Editor
                    value={newSettingsCode}
                    onValueChange={code => { setNewSettingsCode(code) }}
                    highlight={code => code ? highlight(code, languages.js) : null}
                    padding={10}
                    style={{
                      backgroundColor: '#333',
                      fontFamily: '"Fira code", "Fira Mono", monospace',
                      fontSize: 16
                    }}
                  />

                  <Divider />
                  <Button type='primary' size='large' block onClick={saveSettings}>Save Settings</Button>
                </Panel>
              </Collapse>
          }
        </Layout>
      </Layout>
    </Layout>
  )
}

export default Settings
