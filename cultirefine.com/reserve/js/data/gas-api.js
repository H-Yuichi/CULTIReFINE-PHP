// data/gas-api.js
// GAS API通信モジュール（mock-api.jsの置き換え）

// API基底URL
const API_BASE_URL = '/reserve/api-bridge.php';

/**
 * 遅延処理（UIの一貫性のため）
 */
export function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * API呼び出し共通関数
 */
async function apiCall(action, params = {}, method = 'GET', data = null) {
    const url = new URL(API_BASE_URL, window.location.origin);
    url.searchParams.set('action', action);
    
    // GETパラメータを追加
    if (method === 'GET' && params) {
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin' // セッションCookieを含める
    };
    
    // POSTデータを追加
    if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url.toString(), options);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error?.message || 'APIエラーが発生しました');
        }
        
        return result.data;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

/**
 * ユーザー全情報取得
 */
export async function getUserFullInfo() {
    console.log('[GAS API] Getting user full info');
    
    try {
        const data = await apiCall('getUserFullInfo');
        console.log('[GAS API] User data received:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('[GAS API] Error getting user info:', error);
        return { success: false, message: error.message };
    }
}

/**
 * 患者追加（既存APIとの互換性維持）
 */
export function mockAddPatient(patientData) {
    console.log('[GAS API] Adding patient:', patientData);
    
    // 実際の実装では患者追加APIを呼び出し
    return delay(500).then(function() {
        var newPatient = {
            id: "new-" + Date.now(),
            name: patientData.name,
            isNew: true,
            lastVisit: new Date().toISOString().split("T")[0],
        };
        return { success: true, patient: newPatient, message: "患者が正常に追加されました。" };
    });
}

/**
 * 施術間隔チェック
 */
export async function mockCheckTreatmentInterval(patientId, treatmentId, desiredDate) {
    console.log('[GAS API] Checking treatment interval for:', patientId, treatmentId, desiredDate);
    
    try {
        // ユーザー情報から施術履歴を取得
        const userInfo = await getUserFullInfo();
        
        if (!userInfo.success) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }
        
        const treatmentHistory = userInfo.data.treatmentHistory || [];
        const availableTreatments = userInfo.data.availableTreatments || [];
        
        // 指定された施術の情報を取得
        const treatment = availableTreatments.find(t => t.treatmentId === treatmentId);
        
        if (!treatment) {
            return { 
                success: false, 
                isValid: false, 
                message: "指定された施術が見つかりません" 
            };
        }
        
        // 予約可能かチェック
        if (!treatment.canBook) {
            return { 
                success: false, 
                isValid: false, 
                message: treatment.reason || "この施術は現在予約できません" 
            };
        }
        
        // 指定日が次回可能日以降かチェック
        const nextAvailable = new Date(treatment.nextAvailableDate);
        const desired = new Date(desiredDate);
        
        if (desired < nextAvailable) {
            return { 
                success: false, 
                isValid: false, 
                message: `この施術は${treatment.nextAvailableDate}以降に予約可能です` 
            };
        }
        
        return { success: true, isValid: true };
        
    } catch (error) {
        console.error('[GAS API] Error checking treatment interval:', error);
        return { 
            success: false, 
            isValid: false, 
            message: "施術間隔のチェックに失敗しました" 
        };
    }
}

/**
 * 空き時間確認
 */
export async function mockCheckSlotAvailability(treatmentId, dateKey, pairRoomDesired) {
    console.log('[GAS API] Checking slot availability for:', treatmentId, dateKey, pairRoomDesired);
    
    try {
        const data = await apiCall('getAvailability', {
            treatment_id: treatmentId,
            date: dateKey,
            pair_room: pairRoomDesired ? 'true' : 'false'
        });
        
        return {
            success: true,
            availableTimes: data.available_times || [],
            message: data.message || "空き時間を取得しました"
        };
        
    } catch (error) {
        console.error('[GAS API] Error checking availability:', error);
        return {
            success: false,
            availableTimes: [],
            message: "空き時間の確認に失敗しました"
        };
    }
}

/**
 * 一括予約送信
 */
export async function mockSubmitBulkReservation(bookings, lineUserId) {
    console.log('[GAS API] Submitting bulk reservations:', bookings, lineUserId);
    
    try {
        // 複数の予約を順次作成
        const results = [];
        
        for (const booking of bookings) {
            const reservationData = {
                patient_id: booking.patientId,
                treatment_id: booking.treatment.id,
                treatment_name: booking.treatment.name,
                reservation_date: booking.selectedDate,
                reservation_time: booking.selectedTime,
                duration: booking.treatment.duration,
                price: booking.treatment.price,
                is_pair_booking: booking.pairRoomDesired || false
            };
            
            const result = await apiCall('createReservation', {}, 'POST', reservationData);
            results.push(result);
        }
        
        return {
            success: true,
            reservationIds: results.map(r => r.id),
            message: "予約が正常に確定されました。"
        };
        
    } catch (error) {
        console.error('[GAS API] Error submitting reservations:', error);
        return {
            success: false,
            message: "予約の送信に失敗しました: " + error.message
        };
    }
}

/**
 * 予約キャンセル
 */
export async function cancelReservation(reservationId) {
    console.log('[GAS API] Cancelling reservation:', reservationId);
    
    try {
        const data = await apiCall('cancelReservation', {
            reservation_id: reservationId
        });
        
        return {
            success: true,
            data: data,
            message: "予約がキャンセルされました"
        };
        
    } catch (error) {
        console.error('[GAS API] Error cancelling reservation:', error);
        return {
            success: false,
            message: "予約のキャンセルに失敗しました: " + error.message
        };
    }
}

/**
 * API接続テスト
 */
export async function testApiConnection() {
    console.log('[GAS API] Testing API connection');
    
    try {
        const data = await apiCall('testConnection');
        return {
            success: true,
            data: data,
            message: "API接続テスト成功"
        };
    } catch (error) {
        console.error('[GAS API] API connection test failed:', error);
        return {
            success: false,
            message: "API接続テスト失敗: " + error.message
        };
    }
}

/**
 * データマッピング用ヘルパー関数
 */
export function mapGasDataToAppState(gasData) {
    return {
        // 既存のAppStateと互換性のある形式にマッピング
        user: {
            id: gasData.user.id,
            displayName: gasData.user.lineDisplayName,
            name: gasData.user.name,
            email: gasData.user.email,
            phone: gasData.user.phone
        },
        
        patients: [{
            id: gasData.patientInfo.id,
            name: gasData.user.name,
            lastVisit: gasData.patientInfo.lastVisitDate,
            isNew: gasData.patientInfo.isNew
        }],
        
        treatmentHistory: gasData.treatmentHistory,
        availableTreatments: gasData.availableTreatments,
        membershipInfo: gasData.membershipInfo,
        upcomingReservations: gasData.upcomingReservations
    };
}