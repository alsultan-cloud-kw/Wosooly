import React from "react";

const InstagramProfilesList = ({
  profiles,
  onToggleActive,
  onDelete,
}) => {
  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">لا توجد بروفايلات مضافة</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">بروفايلات إنستجرام المضافة</h3>
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              profile.isActive ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">📷</span>
                <div>
                  <h4 className="font-semibold text-gray-800">{profile.brandName}</h4>
                  <p className="text-sm text-gray-600">@{profile.username}</p>
                </div>
                {profile.isActive ? (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    نشط
                  </span>
                ) : (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    غير نشط
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={profile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-blue-600 hover:text-blue-800 font-medium"
              >
                عرض
              </a>
              <button
                onClick={() => profile.id && onToggleActive(profile.id)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  profile.isActive
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    : "bg-green-100 text-green-800 hover:bg-green-200"
                }`}
              >
                {profile.isActive ? "إيقاف" : "تفعيل"}
              </button>
              <button
                onClick={() => profile.id && onDelete(profile.id)}
                className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstagramProfilesList;

