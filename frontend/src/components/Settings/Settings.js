import React, { useState } from 'react';
import { FaUser, FaBell, FaShieldAlt, FaDatabase, FaPalette } from 'react-icons/fa';
import Button from '../UI/Button';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    profile: {
      language: 'ar',
      timeZone: 'Asia/Riyadh',
      dateFormat: 'dd/MM/yyyy'
    },
    notifications: {
      emailNotifications: true,
      expiryReminders: true,
      documentUpdates: false
    },
    security: {
      twoFactorAuth: false,
      passwordExpiry: 90,
      sessionTimeout: 30
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: 365
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      compactView: false
    }
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleInputChange = (section, setting, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [setting]: value
      }
    });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    // Here you would save the settings to the server
    alert('تم حفظ الإعدادات بنجاح');
  };

  const renderProfileSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="form-group">
        <label htmlFor="language">اللغة</label>
        <select
          id="language"
          value={settings.profile.language}
          onChange={(e) => handleInputChange('profile', 'language', e.target.value)}
          className="form-control"
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="timeZone">المنطقة الزمنية</label>
        <select
          id="timeZone"
          value={settings.profile.timeZone}
          onChange={(e) => handleInputChange('profile', 'timeZone', e.target.value)}
          className="form-control"
        >
          <option value="Asia/Riyadh">الرياض (GMT+3)</option>
          <option value="Asia/Dubai">دبي (GMT+4)</option>
          <option value="Asia/Kuwait">الكويت (GMT+3)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="dateFormat">تنسيق التاريخ</label>
        <select
          id="dateFormat"
          value={settings.profile.dateFormat}
          onChange={(e) => handleInputChange('profile', 'dateFormat', e.target.value)}
          className="form-control"
        >
          <option value="dd/MM/yyyy">يوم/شهر/سنة (31/12/2023)</option>
          <option value="MM/dd/yyyy">شهر/يوم/سنة (12/31/2023)</option>
          <option value="yyyy-MM-dd">سنة-شهر-يوم (2023-12-31)</option>
        </select>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">حفظ التغييرات</Button>
      </div>
    </form>
  );

  const renderNotificationSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="emailNotifications"
          checked={settings.notifications.emailNotifications}
          onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
        />
        <label htmlFor="emailNotifications">إشعارات البريد الإلكتروني</label>
        <p className="form-help">تلقي إشعارات عبر البريد الإلكتروني للتحديثات المهمة</p>
      </div>

      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="expiryReminders"
          checked={settings.notifications.expiryReminders}
          onChange={(e) => handleInputChange('notifications', 'expiryReminders', e.target.checked)}
        />
        <label htmlFor="expiryReminders">تذكير بانتهاء صلاحية السياسات</label>
        <p className="form-help">تلقي تذكيرات قبل انتهاء صلاحية السياسات</p>
      </div>

      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="documentUpdates"
          checked={settings.notifications.documentUpdates}
          onChange={(e) => handleInputChange('notifications', 'documentUpdates', e.target.checked)}
        />
        <label htmlFor="documentUpdates">تحديثات المستندات</label>
        <p className="form-help">تلقي إشعارات عند تحديث المستندات</p>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">حفظ التغييرات</Button>
      </div>
    </form>
  );

  const renderSecuritySettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="twoFactorAuth"
          checked={settings.security.twoFactorAuth}
          onChange={(e) => handleInputChange('security', 'twoFactorAuth', e.target.checked)}
        />
        <label htmlFor="twoFactorAuth">المصادقة الثنائية</label>
        <p className="form-help">تفعيل المصادقة الثنائية لزيادة أمان حسابك</p>
      </div>

      <div className="form-group">
        <label htmlFor="passwordExpiry">انتهاء صلاحية كلمة المرور (بالأيام)</label>
        <input
          type="number"
          id="passwordExpiry"
          value={settings.security.passwordExpiry}
          onChange={(e) => handleInputChange('security', 'passwordExpiry', parseInt(e.target.value))}
          className="form-control"
          min="30"
          max="365"
        />
        <p className="form-help">عدد الأيام قبل مطالبتك بتغيير كلمة المرور</p>
      </div>

      <div className="form-group">
        <label htmlFor="sessionTimeout">مهلة الجلسة (بالدقائق)</label>
        <input
          type="number"
          id="sessionTimeout"
          value={settings.security.sessionTimeout}
          onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
          className="form-control"
          min="5"
          max="120"
        />
        <p className="form-help">وقت عدم النشاط قبل تسجيل الخروج تلقائيًا</p>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">حفظ التغييرات</Button>
      </div>
    </form>
  );

  const renderSystemSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="autoBackup"
          checked={settings.system.autoBackup}
          onChange={(e) => handleInputChange('system', 'autoBackup', e.target.checked)}
        />
        <label htmlFor="autoBackup">النسخ الاحتياطي التلقائي</label>
        <p className="form-help">إنشاء نسخ احتياطية تلقائية للبيانات</p>
      </div>

      <div className="form-group">
        <label htmlFor="backupFrequency">تكرار النسخ الاحتياطي</label>
        <select
          id="backupFrequency"
          value={settings.system.backupFrequency}
          onChange={(e) => handleInputChange('system', 'backupFrequency', e.target.value)}
          className="form-control"
          disabled={!settings.system.autoBackup}
        >
          <option value="daily">يومي</option>
          <option value="weekly">أسبوعي</option>
          <option value="monthly">شهري</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="dataRetention">الاحتفاظ بالبيانات (بالأيام)</label>
        <input
          type="number"
          id="dataRetention"
          value={settings.system.dataRetention}
          onChange={(e) => handleInputChange('system', 'dataRetention', parseInt(e.target.value))}
          className="form-control"
          min="30"
          max="1095"
        />
        <p className="form-help">مدة الاحتفاظ بسجلات النظام والبيانات التاريخية</p>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">حفظ التغييرات</Button>
      </div>
    </form>
  );

  const renderAppearanceSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="form-group">
        <label htmlFor="theme">السمة</label>
        <select
          id="theme"
          value={settings.appearance.theme}
          onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
          className="form-control"
        >
          <option value="light">فاتح</option>
          <option value="dark">داكن</option>
          <option value="system">حسب إعدادات النظام</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="fontSize">حجم الخط</label>
        <select
          id="fontSize"
          value={settings.appearance.fontSize}
          onChange={(e) => handleInputChange('appearance', 'fontSize', e.target.value)}
          className="form-control"
        >
          <option value="small">صغير</option>
          <option value="medium">متوسط</option>
          <option value="large">كبير</option>
        </select>
      </div>

      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="compactView"
          checked={settings.appearance.compactView}
          onChange={(e) => handleInputChange('appearance', 'compactView', e.target.checked)}
        />
        <label htmlFor="compactView">عرض مدمج</label>
        <p className="form-help">عرض المزيد من المحتوى على الشاشة بمساحات أقل</p>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">حفظ التغييرات</Button>
      </div>
    </form>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'system':
        return renderSystemSettings();
      case 'appearance':
        return renderAppearanceSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">الإعدادات</h1>
      
      <div className="settings-content">
        <div className="settings-sidebar">
          <ul className="settings-tabs">
            <li 
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <FaUser className="tab-icon" />
              <span>الملف الشخصي</span>
            </li>
            <li 
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => handleTabChange('notifications')}
            >
              <FaBell className="tab-icon" />
              <span>الإشعارات</span>
            </li>
            <li 
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => handleTabChange('security')}
            >
              <FaShieldAlt className="tab-icon" />
              <span>الأمان</span>
            </li>
            <li 
              className={`settings-tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => handleTabChange('system')}
            >
              <FaDatabase className="tab-icon" />
              <span>النظام</span>
            </li>
            <li 
              className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => handleTabChange('appearance')}
            >
              <FaPalette className="tab-icon" />
              <span>المظهر</span>
            </li>
          </ul>
        </div>
        
        <div className="settings-panel">
          <h2 className="panel-title">
            {activeTab === 'profile' && 'إعدادات الملف الشخصي'}
            {activeTab === 'notifications' && 'إعدادات الإشعارات'}
            {activeTab === 'security' && 'إعدادات الأمان'}
            {activeTab === 'system' && 'إعدادات النظام'}
            {activeTab === 'appearance' && 'إعدادات المظهر'}
          </h2>
          
          <div className="panel-content">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 