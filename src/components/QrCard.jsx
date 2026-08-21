import { memo } from 'react';
import { buildQrImageUrl } from '../services/api.js';

// Map garment size -> the corresponding "average" key on the fabric record.
const SIZE_TO_AVG_KEY = {
  XXS: 'average_xxs_xs',
  XS: 'average_xxs_xs',
  S: 'average_s_m',
  M: 'average_s_m',
  L: 'average_l_xl',
  XL: 'average_l_xl',
  '2XL': 'average_2xl_3xl',
  XXL: 'average_2xl_3xl',
  '3XL': 'average_2xl_3xl',
  '4XL': 'average_4xl_5xl',
  '5XL': 'average_4xl_5xl',
};

// const formatDate = (raw) => {
//   if (!raw) return '';
//   const d = new Date(raw);
//   if (Number.isNaN(d.getTime())) return raw;

//   const day = String(d.getDate()).padStart(2, '0');
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const year = String(d.getFullYear()).slice(-2);
//   const time = d.toLocaleTimeString('en-US', {
//     hour: '2-digit',
//     minute: '2-digit',
//     second: '2-digit',
//     hour12: true,
//   });

//   return `${day}-${month}-${year}, ${time}`;
// };
const formatDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);

  // Time without leading zero for hours
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format, keep 12 as is

  const time = `${hours}:${minutes}:${seconds} ${ampm}`;

  return `${day}-${month}-${year}, ${time}`;
};
const getAverage = (avgFabric, size) => {
  if (!avgFabric) return '';
  const key = SIZE_TO_AVG_KEY[size];
  return key ? (avgFabric[key] ?? '') : '';
};

const QrCard = ({ product, fabricDetails }) => {
  const orderId = product['(Do not touch) Order Id'] || '';
  const fabrics = fabricDetails?.fabrics ?? [];
  const fabricAvgs = fabricDetails?.fabricAvgDetails?.[0]?.fabrics ?? [];
  const size = product['Size'];

  return (
    <div className="qr-card ">
      <div className="details font-[Poppins]">
        <div className=" gap-0.5 relative">
          <span className="font-extrabold text-[11px]">
            {' '}
            {product['Channel'] || ''} :{formatDate(product['Date'])}{' '}
          </span>
          <span className="text-[16px] mt-0.5 ml-auto">
            {' '}
            {product['Style Number'] || ''}-{product['Size'] || ''}
          </span>
          <span className="absolute text-[13px] top-0.5">
            {' '}
            {product['Style 1'] ? `(${product['Style 1']})` : ''}
          </span>
          <span
            className="flex items-center justify-center  "
            style={{
              position: 'absolute',
              right: '-80px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              fontWeight: 'bold',
              lineHeight: '1.2',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {(() => {
              const channelCode = product['Channel']?.slice(0, 2) || '';
              const dateObj = new Date(product['Date']);
              const hours = dateObj.getHours();
              const suffix = hours >= 12 ? '(B)' : '(M)';
              return `${channelCode}${suffix}`;
            })()}
          </span>
          <span>{product['Style 2'] || ''} </span>
        </div>

        <div>
          <span className="bold"></span> {product['Brand'] || ''}{' '}
          <span style={{ fontSize: 18 }} className="bold">
            ({product['Pattern#'] || ''})
          </span>{' '}
          {product['Color'] || ''} ({product['Style Type'] || ''})
        </div>

        {fabrics.map((fab, idx) => {
          const avg = getAverage(fabricAvgs[idx], size);
          const fabricName = fab.fabric_name || '';
          if (!fabricName && !avg) return null;
          return (
            <div key={idx}>
              <span className="bold">F{idx + 1}:</span> {fabricName}
              {avg && (
                <span className="" style={{ fontSize: 10 }}>
                  {avg ? ` ${idx === 0 ? 'N :' : ''} (${avg}) ` : ''}
                  {avg && idx === 0 ? `W: (${(avg / 1.4).toFixed(2)})` : ''}
                </span>
              )}
              {fab?.width ? ` (${fab.width})` : ''}
            </div>
          );
        })}

        <div>
          <span className="bold">Accessory 1:</span> {product['Accessory 1'] || ''}
          {product['Accessory 2'] ? ` | ${product['Accessory 2']}` : ''}
        </div>

        <div>
          <span className="bold">Wash Care:</span>{' '}
          <span style={{ fontSize: 16 }}>({product['Wash Care']?.[0] || ''}W)</span>
        </div>
      </div>

      <div className="qr-section pb-2">
        {orderId ? (
          <>
            <img
              src={buildQrImageUrl(orderId, { size: 200 })}
              alt={`QR for order ${orderId}`}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Hide broken-image icon if the QR service ever fails for this card.
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <span className="text-[13px] text-center ">{orderId}</span>
          </>
        ) : (
          <div style={{ fontSize: 10, color: '#999' }}>No Order ID</div>
        )}
      </div>
    </div>
  );
};

// Cards re-render only when their inputs actually change.
export default memo(QrCard);
